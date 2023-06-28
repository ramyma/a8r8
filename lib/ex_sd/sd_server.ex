defmodule ExSd.SdSever do
  use GenServer

  require Logger

  alias ExSd.Sd.ImageService
  alias ExSd.Sd.SdService
  alias ExSd.Sd.{MemoryStats, GenerationParams}
  alias ExSd.Sd
  alias ExSd.AutoClient

  def start_link(init_args) do
    # you may want to register your server with `name: __MODULE__`
    # as a third argument to `start_link`
    GenServer.start_link(__MODULE__, [init_args], name: __MODULE__)
  end

  @impl true
  def init(_args) do
    client = AutoClient.client()
    Logger.info("INIT")

    {:ok,
     %{
       client: client,
       memory_stats: %MemoryStats{},
       options: nil,
       samplers: [],
       models: [],
       upscalers: [],
       loras: [],
       embeddings: [],
       controlnet_models: [],
       controlnet_modules: [],
       task: nil,
       generating_session_name: nil,
       progress: 0,
       eta_relative: 0,
       is_connected: false,
       scripts: nil
     }, {:continue, :init_status_loop}}
  end

  @impl true
  @spec handle_continue(:init_status_loop, %{
          :client => binary | Tesla.Client.t(),
          optional(any) => any
        }) :: {:noreply, %{:client => binary | Tesla.Client.t(), optional(any) => any}}
  def handle_continue(:init_status_loop, state) do
    Process.send(self(), :status, [])

    initialize_state(state)

    {:noreply, state}
  end

  @impl true
  def handle_info(:status, state) do
    Process.send_after(self(), :status, 100)

    new_state = state |> put_memory_usage() |> put_progress()

    new_state =
      if(
        !state.is_connected and new_state.is_connected,
        do: initialize_state(new_state),
        else: new_state
      )

    if not Map.equal?(new_state.memory_stats, state.memory_stats) do
      Sd.broadcast_memory_stats(new_state.memory_stats)
    end

    if state.is_connected != new_state.is_connected do
      Sd.broadcast_connection_status(%{isConnected: new_state.is_connected})
    end

    {:noreply, new_state}
  end

  @impl true
  def handle_info({ref, {:error, error}}, state) when state.task.ref == ref do
    Logger.error("Generation: Server error!")
    handle_generation_error(error)

    Sd.broadcast_progress(%{
      progress: 0,
      etaRelative: 0,
      isGenerating: false
    })

    {:noreply, %{state | task: nil, progress: 0, eta_relative: 0, generating_session_name: nil}}
  end

  @impl true
  def handle_info(
        {ref, {seed, images_base64, position, dimensions}},
        state
      )
      when state.task.ref == ref do
    Logger.info("Broadcasting generated image")

    ExSd.Sd.broadcast_generated_image(%{
      image: "data:image/png;base64,#{List.first(images_base64)}",
      position: position,
      dimensions: dimensions,
      seed: seed
    })

    Sd.broadcast_progress(%{
      progress: 0,
      etaRelative: 0,
      isGenerating: false,
      time: DateTime.utc_now()
    })

    images_base64
    |> Enum.with_index(1)
    |> Enum.each(fn {image, index} ->
      ImageService.save(image, "output_image#{index}")
    end)

    #  push_event("current_image", %{currentImage: List.first(images_base64)}
    {:noreply, %{state | progress: 0, eta_relative: 0}}
  end

  @impl true
  def handle_info(
        {:DOWN, ref, :process, _, :normal},
        state
      )
      when state.task.ref == ref do
    # |> push_event("current_image", %{currentImage: nil, preview: true})
    {:noreply, %{state | task: nil, generating_session_name: nil}}
  end

  @impl true
  def handle_info(
        {ref, _},
        state
      )
      when state.task.ref != ref do
    Logger.info("Task ref not in state, doing noting.")
    {:noreply, state}
  end

  # TODO: catch all when task ref doesn't match the one in state

  # @impl true
  # def handle_info(
  #       {:DOWN, ref, :process, _, :normal},
  #       state
  #     )
  #     when state.task.ref == ref do
  #   # |> push_event("current_image", %{currentImage: nil, preview: true})
  #   {:noreply, %{state | task: nil}}
  # end

  @impl true
  def handle_info(
        {:DOWN, _ref, :process, _, :normal},
        state
      ) do
    Logger.info("Task normal shutdown")
    # |> push_event("current_image", %{currentImage: nil, preview: true})
    {:noreply, state}
  end

  @impl true
  def handle_cast(
        {:generate, _generation_params, _attrs, _session_name},
        state
      )
      when not is_nil(state.task.ref) do
    Logger.info("Already generating, nothing will happen!")
    {:noreply, state}
  end

  @impl true
  def handle_cast(
        {:generate, generation_params, attrs, session_name},
        %{client: client} = state
      ) do
    task = Task.async(fn -> SdService.generate_image(client, generation_params, attrs) end)

    {:noreply, %{state | task: task, generating_session_name: session_name}}
  end

  @impl true
  def handle_cast(:interrupt, %{client: client} = state) when not is_nil(state.task) do
    SdService.interrupt(client)
    Task.shutdown(state.task, :brutal_kill)

    Sd.broadcast_progress(%{
      progress: 0,
      etaRelative: 0,
      isGenerating: false
    })

    {:noreply, %{state | task: nil, generating_session_name: nil}}
  end

  @impl true
  def handle_cast(:interrupt, %{client: client} = state) when is_nil(state.task) do
    SdService.interrupt(client)

    Sd.broadcast_progress(%{
      progress: 0,
      etaRelative: 0,
      isGenerating: false
    })

    {:noreply, state}
  end

  @impl true
  def handle_cast(:memory, %{memory_stats: memory_stats} = state) do
    Sd.broadcast_memory_stats(memory_stats)
    {:noreply, state}
  end

  @impl true
  def handle_cast({:set_model, model_title}, state) do
    Sd.broadcast_model_loading_status(true)
    new_state = state |> put_active_model(model_title)
    Sd.broadcast_model_loading_status(false)
    {:noreply, new_state}
  end

  @impl true
  def handle_cast({:controlnet_detect, params}, %{client: client} = state) do
    Task.start(fn ->
      case SdService.controlnet_detect(client, params) do
        {:ok, result} ->
          Sd.broadcast_controlenet_detection(result, params["layer_id"])

        {:error, error} ->
          Sd.broadcast_error(error)
      end
    end)

    {:ok, state}
  end

  @impl true
  def handle_call(:samplers, _, %{samplers: samplers} = state) do
    {:reply, {:ok, samplers}, state}
  end

  @impl true
  def handle_call(:models, _, state) do
    new_state = state |> refresh_and_put_models
    {:reply, {:ok, new_state.models}, state}
  end

  @impl true
  def handle_call(:scripts, _, %{scripts: scripts} = state) do
    {:reply, {:ok, scripts}, state}
  end

  @impl true
  def handle_call(:upscalers, _, state) do
    new_state = state |> put_upscalers()
    {:reply, {:ok, new_state.upscalers}, state}
  end

  @impl true
  def handle_call(:loras, _, state) do
    new_state = state |> put_loras()
    {:reply, {:ok, new_state.loras}, state}
  end

  @impl true
  def handle_call(:embeddings, _, state) do
    new_state = state |> put_embeddings()
    {:reply, {:ok, new_state.embeddings}, state}
  end

  @impl true
  def handle_call(:controlnet_models, _, %{controlnet_models: controlnet_models} = state) do
    {:reply, {:ok, controlnet_models}, state}
  end

  @impl true
  def handle_call(:controlnet_modules, _, %{controlnet_modules: controlnet_modules} = state) do
    {:reply, {:ok, controlnet_modules}, state}
  end

  @impl true
  def handle_call(:options, _, state) do
    new_state = state |> put_options()
    {:reply, {:ok, new_state.options}, new_state}
  end

  @impl true
  def handle_call({:get_png_info, png_data_url}, _, state) do
    png_info = fetch_png_info(state, png_data_url)
    {:reply, {:ok, png_info}, state}
  end

  @impl true
  def handle_call(:get_is_connected, _, state) do
    {:reply, {:ok, state.is_connected}, state}
  end

  defp initialize_state(state) do
    state
    |> put_progress()
    |> put_samplers()
    |> put_models()
    |> put_upscalers()
    |> put_loras()
    |> put_scripts()
    |> put_embeddings()
    |> put_controlnet_models()
    |> put_controlnet_modules()
  end

  defp put_samplers(%{client: client} = state) do
    case SdService.get_samplers(client) do
      {:ok, samplers} ->
        state |> Map.put(:samplers, samplers)

      {:error, _} ->
        state
    end
  end

  defp put_controlnet_models(%{client: client} = state) do
    case SdService.get_controlnet_models(client) do
      {:ok, controlnet_models} ->
        state |> Map.put(:controlnet_models, controlnet_models)

      {:error, _} ->
        state
    end
  end

  defp put_controlnet_modules(%{client: client} = state) do
    case SdService.get_controlnet_modules(client) do
      {:ok, controlnet_modules, controlnet_module_detail} ->
        mapped_modules =
          controlnet_modules
          |> Enum.map(fn module ->
            %{name: module, sliders: controlnet_module_detail[module]["sliders"]}
          end)

        state
        |> Map.put(:controlnet_modules, mapped_modules)

      {:error, _} ->
        state
    end
  end

  defp put_models(%{client: client} = state) do
    case SdService.get_models(client) do
      {:ok, models} ->
        state |> Map.put(:models, models |> Enum.sort_by(& &1["model_name"]))

      {:error, _} ->
        state
    end
  end

  defp put_scripts(%{client: client} = state) do
    case SdService.get_scripts(client) do
      {:ok, scripts} ->
        state |> Map.put(:scripts, scripts)

      {:error, _} ->
        state
    end
  end

  defp refresh_and_put_models(%{client: client} = state) do
    case SdService.refresh_models(client) do
      {:ok, _} ->
        state |> put_models()

      {:error, _} ->
        state
    end
  end

  defp put_upscalers(%{client: client} = state) do
    # upscalers = Sd.load_upscalers()
    # state |> Map.put(:upscalers, upscalers)
    case SdService.get_upscalers(client) do
      {:ok, upscalers} ->
        state
        |> Map.put(
          :upscalers,
          upscalers
          |> Enum.map(& &1["name"])
          |> Enum.filter(&(!is_nil(&1) and !String.match?(&1, ~r/none/i)))
          |> Enum.sort()
        )

      {:error, _} ->
        state
    end
  end

  defp put_loras(%{client: client} = state) do
    # loras = Sd.load_loras()
    # state |> Map.put(:loras, loras)
    case SdService.get_loras(client) do
      {:ok, loras} ->
        state |> Map.put(:loras, loras)

      {:error, _} ->
        state
    end
  end

  defp put_embeddings(%{client: client} = state) do
    case SdService.get_embeddings(client) do
      {:ok, embeddings} ->
        state
        |> Map.put(:embeddings, embeddings)

      {:error, _} ->
        state
    end
  end

  defp put_memory_usage(%{client: client} = state) do
    case SdService.get_memory_usage(client) do
      {:ok,
       %{
         "ram" => %{
           "free" => _free_ram,
           "used" => used_ram,
           "total" => total_ram
         },
         "cuda" => %{
           "system" => %{
             "free" => _free_cuda,
             "used" => used_cuda,
             "total" => total_cuda
           }
         }
       }} ->
        state
        |> Map.put(:memory_stats, %MemoryStats{
          ram_usage: round(used_ram / total_ram * 100),
          cuda_usage: round(used_cuda / total_cuda * 100)
        })
        |> Map.put(:is_connected, true)

      {:error, _} ->
        # TODO: handle error?
        state |> Map.put(:is_connected, false)
    end
  end

  defp put_options(%{client: client} = state) do
    case SdService.get_options(client) do
      {:ok, options} ->
        state |> Map.put(:options, options)

      {:error, _} ->
        state
    end
  end

  defp fetch_png_info(%{client: client}, png_data_url) do
    case SdService.get_png_info(client, png_data_url) do
      {:ok, _png_info} = resp ->
        resp

      {:error, _} ->
        nil
        # TODO: handle error
    end
  end

  defp put_active_model(%{client: client} = state, model_title) do
    case SdService.post_active_model(client, model_title) do
      {:ok, options} ->
        state |> Map.put(:options, options)

      {:error, _} ->
        state
    end
  end

  defp handle_generation_error(error) when is_map(error) do
    Sd.broadcast_error(error)
  end

  defp handle_generation_error(error) when error === :closed do
    Sd.broadcast_error(%{error: "Connection closed"})
  end

  defp handle_generation_error(error) when error === :timeout do
    Sd.broadcast_error(%{error: "Connection timeout"})
  end

  def put_progress(
        %{client: client, task: task, generating_session_name: generating_session_name} = state
      )
      when not is_nil(task) do
    case SdService.get_progress(client) do
      {:ok,
       %{
         "progress" => progress,
         "eta_relative" => eta_relative,
         "current_image" => current_image
       }} ->
        # if !is_nil(current_image) do
        Sd.broadcast_progress(%{
          currentImage: if(current_image, do: "data:image/png;base64,#{current_image}", else: ""),
          progress: round(progress * 100),
          etaRelative: eta_relative,
          isGenerating: true,
          generatingSessionName: generating_session_name
        })

        # end

        state
        |> Map.put(
          :progress,
          round(progress * 100)
        )
        |> Map.put(
          :eta_relative,
          eta_relative
          |> :erlang.float_to_binary(decimals: 1)
          |> String.to_float()
        )

      # |> assign(:preview, current_image)

      {:error, _} ->
        state
    end
  end

  def put_progress(state) do
    state |> Map.merge(%{task: nil, progress: 0, eta_relative: 0, generating_session_name: nil})
  end

  def generate(%GenerationParams{} = generation_params, attrs, session_name) do
    GenServer.cast(__MODULE__, {:generate, generation_params, attrs, session_name})
  end

  def interrupt() do
    GenServer.cast(__MODULE__, :interrupt)
  end

  def get_memory_usage() do
    GenServer.cast(__MODULE__, :memory)
  end

  @spec get_samplers :: {:ok, list()}
  def get_samplers() do
    GenServer.call(__MODULE__, :samplers)
  end

  @spec get_models :: {:ok, list()}
  def get_models() do
    GenServer.call(__MODULE__, :models)
  end

  @spec get_models :: {:ok, map()}
  def get_scripts() do
    GenServer.call(__MODULE__, :scripts)
  end

  @spec get_upscalers :: {:ok, list()}
  def get_upscalers() do
    GenServer.call(__MODULE__, :upscalers)
  end

  @spec get_loras :: {:ok, list()}
  def get_loras() do
    GenServer.call(__MODULE__, :loras)
  end

  @spec get_embeddings :: {:ok, map()}
  def get_embeddings() do
    GenServer.call(__MODULE__, :embeddings)
  end

  @spec get_controlnet_models :: {:ok, list(binary)}
  def get_controlnet_models() do
    GenServer.call(__MODULE__, :controlnet_models)
  end

  @spec get_controlnet_modules :: {:ok, list(binary)}
  def get_controlnet_modules() do
    GenServer.call(__MODULE__, :controlnet_modules)
  end

  @spec get_options :: {:ok, map()}
  def get_options() do
    GenServer.call(__MODULE__, :options)
  end

  def set_model(model_title) do
    GenServer.cast(__MODULE__, {:set_model, model_title})
  end

  def get_png_info(png_data_url) do
    GenServer.call(__MODULE__, {:get_png_info, png_data_url})
  end

  def get_is_connected() do
    GenServer.call(__MODULE__, :get_is_connected)
  end

  def controlnet_detect(params) do
    GenServer.cast(__MODULE__, {:controlnet_detect, params})
  end

  def stop() do
    GenServer.stop(ExSd.SdSever)
  end
end
