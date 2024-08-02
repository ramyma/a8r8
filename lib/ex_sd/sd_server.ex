defmodule ExSd.SdServer do
  use GenServer

  require Logger

  alias ExSd.Sd.ImageService
  alias ExSd.Sd.SdService
  alias ExSd.Sd.{MemoryStats, GenerationParams}
  alias ExSd.Sd

  def start_link(init_args) do
    # you may want to register your server with `name: __MODULE__`
    # as a third argument to `start_link`
    GenServer.start_link(__MODULE__, [init_args], name: __MODULE__)
  end

  @impl true
  def init(_args) do
    Logger.info("Initializing data")
    Phoenix.PubSub.subscribe(ExSd.PubSub, "generation")

    {:ok,
     %{
       memory_stats: %MemoryStats{},
       options: nil,
       samplers: [],
       schedulers: [],
       models: [],
       vaes: [],
       upscalers: [],
       loras: [],
       embeddings: [],
       controlnet_models: [],
       controlnet_preprocessors: [],
       task: nil,
       generating_session_name: nil,
       progress: 0,
       eta_relative: 0,
       is_connected: false,
       is_generating: false,
       scripts: nil,
       #  FIXME: reinitialize backend on crash correctly
       backend: get_default_backend()
     }, {:continue, :init_status_loop}}
  end

  @impl true
  def handle_continue(:init_status_loop, state) do
    Process.send(self(), :status, [])

    {:noreply, state}
  end

  @impl true
  def handle_info(:status, state) do
    Process.send_after(self(), :status, 100)

    new_state = state |> put_memory_usage() |> put_progress()

    new_state =
      if !state.is_connected and new_state.is_connected do
        Logger.info("Backend connected")

        init_state = initialize_state(new_state)

        Phoenix.PubSub.broadcast!(
          ExSd.PubSub,
          "sd_server",
          {:backend_connection, init_state.backend, true}
        )

        init_state
      else
        new_state
      end

    if state.is_connected and !new_state.is_connected do
      Phoenix.PubSub.broadcast!(
        ExSd.PubSub,
        "sd_server",
        {:backend_connection, state.backend, false}
      )
    end

    if not Map.equal?(new_state.memory_stats, state.memory_stats) do
      Sd.broadcast_memory_stats(new_state.memory_stats)
    end

    if state.is_connected != new_state.is_connected do
      Sd.broadcast_connection_status(%{isConnected: new_state.is_connected})
    end

    {:noreply, new_state}
  end

  @impl true
  def handle_info(:refetch_embeddings, %{embeddings: embeddings} = state) do
    if Enum.empty?(embeddings) do
      new_state = state |> put_embeddings()
      Sd.broadcast_data("embeddings", new_state.embeddings)
      {:noreply, new_state}
    else
      {:noreply, state}
    end
  end

  @impl true
  def handle_info({ref, {:error, error}}, state) when state.task.ref == ref do
    Logger.error("Generation: Server error!")

    IO.inspect(error)
    handle_generation_error(error)

    Sd.broadcast_progress(%{
      progress: 0,
      etaRelative: 0,
      isGenerating: false
    })

    {:noreply,
     %{
       state
       | task: nil,
         progress: 0,
         eta_relative: 0,
         generating_session_name: nil,
         is_generating: false
     }}
  end

  @impl true
  def handle_info(
        {ref, {seed, images_base64, position, dimensions, batch_size}},
        state
      )
      when state.task.ref == ref do
    Logger.info("Broadcasting generated image")

    ExSd.Sd.broadcast_generated_image(%{
      # image: "data:image/png;base64,#{List.first(images_base64)}",
      images:
        images_base64
        |> Enum.slice(0..(batch_size - 1))
        |> Enum.map(fn image_base64 -> "data:image/png;base64,#{image_base64}" end),
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
    {:noreply, %{state | progress: 0, eta_relative: 0, is_generating: false}}
  end

  @impl true
  def handle_info(
        {ref, :ok},
        state
      )
      when state.task.ref == ref do
    {:noreply, state}
  end

  @impl true
  def handle_info(
        {:progress, progress},
        %{backend: :comfy, is_generating: true} = state
      ) do
    ExSd.Sd.broadcast_progress(%{
      progress: progress,
      etaRelative: 0,
      isGenerating: true
    })

    {:noreply, state}
  end

  @impl true
  def handle_info(
        {:progress_preview, image_base64_string},
        %{backend: :comfy, is_generating: true, generating_session_name: generating_session_name} =
          state
      ) do
    Sd.broadcast_progress(%{
      currentImage: "data:image/png;base64,#{image_base64_string}",
      generatingSessionName: generating_session_name
    })

    {:noreply, state}
  end

  @impl true
  def handle_info(
        {:progress_preview, _image_base64_string},
        state
      ) do
    Logger.warning("Unexpected progress preview")

    {:noreply, state}
  end

  @impl true
  def handle_info(
        {:progress, _progress},
        %{backend: :comfy, is_generating: false} = state
      ) do
    {:noreply, state}
  end

  @impl true
  def handle_info(
        {:generation_complete,
         %{
           attrs: attrs,
           dimensions: dimensions,
           flow: %{generation_params: %{seed: seed, batch_size: batch_size}}
         } =
           result},
        %{backend: :comfy} = state
      ) do
    # {seed, images_base64, position, dimensions} = result
    images_base64 = Sd.SdService.handle_generation_completion(result, :comfy)

    # {seed, images_base64 |> List.replace_at(0, change), position, %{width: width, height: height}}

    ExSd.Sd.broadcast_generated_image(%{
      images:
        images_base64
        |> Enum.slice(0..(batch_size - 1))
        |> Enum.map(fn image_base64 -> "data:image/png;base64,#{image_base64}" end),
      position: attrs["position"],
      dimensions: dimensions,
      seed: seed
    })

    ExSd.Sd.broadcast_progress(%{
      progress: 0,
      etaRelative: 0,
      isGenerating: false
    })

    {:noreply, %{state | is_generating: false, generating_session_name: nil}}
  end

  @impl true
  def handle_info(
        :generation_cached,
        %{backend: :comfy} = state
      ) do
    ExSd.Sd.broadcast_message("Generation cached", "", :warning)

    ExSd.Sd.broadcast_progress(%{
      progress: 0,
      etaRelative: 0,
      isGenerating: false
    })

    {:noreply, %{state | is_generating: false, generating_session_name: nil}}
  end

  @impl true
  def handle_info(
        :loading_model,
        %{backend: :comfy} = state
      ) do
    ExSd.Sd.broadcast_message("Loading model", "", :warning)

    {:noreply, state}
  end

  @impl true
  def handle_info(
        :execution_start,
        %{backend: :comfy, generating_session_name: generating_session_name} = state
      ) do
    ExSd.Sd.broadcast_progress(%{
      progress: 0,
      etaRelative: 0,
      isGenerating: true,
      generatingSessionName: generating_session_name
    })

    {:noreply, %{state | is_generating: true}}
  end

  @impl true
  def handle_info(
        {:generation_error, error},
        %{generating_session_name: generating_session_name} = state
      ) do
    handle_generation_error(error, backend: :comfy)

    Sd.broadcast_progress(%{
      progress: 0,
      etaRelative: 0,
      isGenerating: false,
      generatingSessionName: generating_session_name
    })

    {:noreply,
     %{state | task: nil, generating_session_name: nil, progress: 0, is_generating: false}}
  end

  @impl true
  def handle_info(
        {:DOWN, ref, :process, _, :normal},
        %{backend: :auto} = state
      )
      when state.task.ref == ref do
    {:noreply, %{state | task: nil, generating_session_name: nil, is_generating: false}}
  end

  @impl true
  def handle_info(
        {:DOWN, ref, :process, _, :normal},
        %{backend: :comfy} = state
      )
      when state.task.ref == ref do
    {:noreply, %{state | task: nil}}
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
        %{backend: backend} = state
      ) do
    task =
      Task.async(fn -> SdService.generate_image(generation_params, attrs, backend: backend) end)

    {:noreply, %{state | task: task, generating_session_name: session_name, is_generating: true}}
  end

  @impl true
  def handle_cast(:interrupt, %{backend: backend} = state) when not is_nil(state.task) do
    SdService.interrupt(backend)
    Task.shutdown(state.task, :brutal_kill)

    Sd.broadcast_progress(%{
      progress: 0,
      etaRelative: 0,
      isGenerating: false
    })

    {:noreply,
     %{state | task: nil, generating_session_name: nil, progress: 0, is_generating: false}}
  end

  @impl true
  def handle_cast(:interrupt, %{backend: backend} = state) when is_nil(state.task) do
    SdService.interrupt(backend)

    Sd.broadcast_progress(%{
      progress: 0,
      etaRelative: 0,
      isGenerating: false
    })

    {:noreply, %{state | is_generating: false}}
  end

  @impl true
  def handle_cast(:free_memory, %{backend: backend} = state) do
    SdService.free_memory(backend)

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
  def handle_cast({:set_vae, vae}, state) do
    Sd.broadcast_vae_loading_status(true)
    new_state = state |> put_active_vae(vae)
    Sd.broadcast_vae_loading_status(false)
    {:noreply, new_state}
  end

  @impl true
  def handle_cast({:controlnet_detect, params}, state) do
    Task.start(fn ->
      case SdService.controlnet_detect(params) do
        {:ok, result} ->
          Sd.broadcast_controlenet_detection(result, params["layer_id"])

        {:error, error} ->
          Sd.broadcast_error(error)
      end
    end)

    {:noreply, state}
  end

  @impl true
  def handle_cast({:set_backend, backend}, state) do
    new_state = %{state | backend: String.to_existing_atom(backend), is_connected: false}

    Phoenix.PubSub.broadcast!(
      ExSd.PubSub,
      "sd_server",
      {:backend_change, backend}
    )

    Sd.broadcast_connection_status(%{isConnected: false})
    Sd.broadcast_data("backend", backend)
    Sd.broadcast_data("models", [])
    {:noreply, new_state}
  end

  @impl true
  def handle_cast(:loras, state) do
    new_state = state |> refresh_and_put_loras()
    Sd.broadcast_data("loras", new_state.loras)
    {:noreply, state}
  end

  @impl true
  def handle_cast(:samplers, %{samplers: samplers} = state) do
    Sd.broadcast_data("samplers", samplers)

    {:noreply, state}
  end

  @impl true
  def handle_cast(:models, state) do
    new_state = state |> refresh_and_put_models
    Sd.broadcast_data("models", new_state.models)

    {:noreply, state}
  end

  @impl true
  def handle_cast(:vaes, state) do
    new_state = state |> put_vaes()

    Sd.broadcast_data("vaes", new_state.vaes)

    {:noreply, state}
  end

  @impl true
  def handle_cast(:schedulers, state) do
    new_state = state |> put_schedulers()

    Sd.broadcast_data("schedulers", new_state.schedulers)

    {:noreply, state}
  end

  @impl true
  def handle_cast(:scripts, %{scripts: scripts} = state) do
    Sd.broadcast_data("scripts", scripts)

    {:noreply, state}
  end

  @impl true
  def handle_cast(:upscalers, state) do
    new_state = state |> put_upscalers()

    Sd.broadcast_data("upscalers", new_state.upscalers)

    {:noreply, state}
  end

  @impl true
  def handle_cast(:embeddings, state) do
    new_state = state |> put_embeddings()

    Sd.broadcast_data("embeddings", new_state.embeddings)

    {:noreply, state}
  end

  @impl true
  def handle_cast(:controlnet_models, %{controlnet_models: controlnet_models} = state) do
    Sd.broadcast_data("controlnet_models", controlnet_models)

    {:noreply, state}
  end

  @impl true
  def handle_cast(
        :controlnet_preprocessors,
        %{controlnet_preprocessors: controlnet_preprocessors} = state
      ) do
    Sd.broadcast_data("controlnet_preprocessors", controlnet_preprocessors)

    {:noreply, state}
  end

  @impl true
  def handle_cast(:options, state) do
    new_state = state |> maybe_put_options()

    Sd.broadcast_data("options", new_state.options)

    {:noreply, new_state}
  end

  @impl true
  def handle_call(:backend, _, %{backend: backend} = state) do
    {:reply, {:ok, backend}, state}
  end

  @impl true
  def handle_call({:get_png_info, png_data_url}, _, state) do
    png_info = fetch_png_info(png_data_url)
    {:reply, {:ok, png_info}, state}
  end

  @impl true
  def handle_call(:get_is_connected, _, state) do
    {:reply, {:ok, state.is_connected}, state}
  end

  defp initialize_state(state) do
    # there's a delay between a1111 server starting and embeddings
    # getting loaded. This to refetch embeddings with a small delay
    # to make sure they were loaded
    Process.send_after(self(), :refetch_embeddings, 2500)

    state
    |> put_progress()
    |> put_samplers()
    |> put_models()
    |> put_vaes()
    |> put_upscalers()
    |> put_loras()
    |> put_scripts()
    |> put_embeddings()
    |> put_controlnet_models()
    |> put_controlnet_preprocessors()
  end

  defp put_samplers(%{backend: backend} = state) do
    case SdService.get_samplers(backend) do
      {:ok, samplers} ->
        state |> Map.put(:samplers, samplers)

      {:error, _} ->
        state
    end
  end

  defp put_controlnet_models(%{backend: backend} = state) do
    case SdService.get_controlnet_models(backend) do
      {:ok, controlnet_models} ->
        state |> Map.put(:controlnet_models, controlnet_models)

      {:error, _} ->
        state
    end
  end

  defp put_controlnet_preprocessors(%{backend: :auto} = state) do
    case SdService.get_controlnet_preprocessors(:auto) do
      {:ok, controlnet_preprocessors, controlnet_module_detail} ->
        mapped_modules =
          controlnet_preprocessors
          |> Enum.map(fn module ->
            %{name: module, sliders: controlnet_module_detail[module]["sliders"]}
          end)

        state
        |> Map.put(:controlnet_preprocessors, mapped_modules)

      {:error, _} ->
        state
    end
  end

  defp put_controlnet_preprocessors(%{backend: :comfy} = state) do
    case SdService.get_controlnet_preprocessors(:comfy) do
      {:ok, controlnet_preprocessors} ->
        mapped_modules =
          controlnet_preprocessors
          |> Enum.sort()
          |> List.insert_at(0, "None")

        state
        |> Map.put(:controlnet_preprocessors, mapped_modules)

      {:error, _} ->
        state
    end
  end

  defp put_models(%{backend: :auto} = state) do
    case SdService.get_models(:auto) do
      {:ok, models} ->
        state |> Map.put(:models, models |> Enum.sort_by(& &1["model_name"]))

      {:error, _} ->
        state
    end
  end

  defp put_models(%{backend: :comfy} = state) do
    case SdService.get_models(:comfy) do
      {:ok, models} ->
        state |> Map.put(:models, models |> Enum.sort())

      {:error, _} ->
        state
    end
  end

  defp put_vaes(%{backend: :auto} = state) do
    case SdService.get_vaes(:auto) do
      {:ok, vaes} ->
        state
        |> Map.put(
          :vaes,
          vaes |> Enum.map(& &1["model_name"]) |> Enum.sort()
        )

      {:error, _} ->
        state
    end
  end

  defp put_vaes(%{backend: :comfy} = state) do
    case SdService.get_vaes(:comfy) do
      {:ok, vaes} ->
        state |> Map.put(:vaes, vaes |> Enum.sort())

      {:error, _} ->
        state
    end
  end

  defp put_scripts(state) do
    case SdService.get_scripts() do
      {:ok, scripts} ->
        state |> Map.put(:scripts, scripts)

      {:error, _} ->
        state
    end
  end

  defp refresh_and_put_models(%{backend: :auto} = state) do
    case SdService.refresh_models() do
      {:ok, _} ->
        state |> put_models()

      {:error, _} ->
        state
    end
  end

  defp refresh_and_put_models(%{backend: :comfy} = state) do
    state |> put_models()
  end

  defp put_schedulers(%{backend: backend} = state) do
    case SdService.get_schedulers(backend) do
      {:ok, schedulers} ->
        state |> Map.put(:schedulers, schedulers |> Enum.sort())

      {:error, _} ->
        state
    end
  end

  defp put_upscalers(%{backend: :auto} = state) do
    # upscalers = Sd.load_upscalers()
    # state |> Map.put(:upscalers, upscalers)
    case SdService.get_upscalers(:auto) do
      {:ok, upscalers} ->
        state
        |> Map.put(
          :upscalers,
          upscalers
          |> Enum.map(& &1["name"])
          |> Enum.filter(&(!is_nil(&1) and !String.match?(&1, ~r/none/i)))
          # |> Enum.sort()
        )

      {:error, _} ->
        state
    end
  end

  defp put_upscalers(%{backend: :comfy} = state) do
    # upscalers = Sd.load_upscalers()
    # state |> Map.put(:upscalers, upscalers)
    case SdService.get_upscalers(:comfy) do
      {:ok, upscalers} ->
        state
        |> Map.put(
          :upscalers,
          upscalers
          |> Enum.sort()
        )

      {:error, _} ->
        state
    end
  end

  defp put_loras(%{backend: backend} = state) do
    # loras = Sd.load_loras()
    # state |> Map.put(:loras, loras)
    case SdService.get_loras(backend) do
      {:ok, loras} ->
        state |> Map.put(:loras, loras)

      {:error, _} ->
        state
    end
  end

  defp refresh_and_put_loras(state) do
    case SdService.refresh_loras() do
      {:ok, _} ->
        state |> put_loras()

      {:error, _} ->
        state
    end
  end

  defp put_embeddings(%{backend: backend} = state) do
    case SdService.get_embeddings(backend) do
      {:ok, embeddings} ->
        state
        |> Map.put(:embeddings, embeddings)

      {:error, _} ->
        state
    end
  end

  defp put_memory_usage(
         %{backend: backend, generating_session_name: generating_session_name} = state
       ) do
    case SdService.get_memory_usage(backend) do
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

        Sd.broadcast_progress(%{
          progress: 0,
          etaRelative: 0,
          isGenerating: false,
          generatingSessionName: generating_session_name
        })

        state |> Map.put(:is_connected, false)
    end
  end

  defp maybe_put_options(%{backend: :auto} = state) do
    case SdService.get_options() do
      {:ok, options} ->
        state |> Map.put(:options, options)

      {:error, _} ->
        state
    end
  end

  defp maybe_put_options(state) do
    state
  end

  defp fetch_png_info(png_data_url) do
    case SdService.get_png_info(png_data_url) do
      {:ok, _png_info} = resp ->
        resp

      {:error, _} ->
        nil
        # TODO: handle error
    end
  end

  defp put_active_model(state, model_title) do
    case SdService.post_active_model(model_title) do
      {:ok, options} ->
        state |> Map.put(:options, options)

      {:error, _} ->
        state
    end
  end

  defp put_active_vae(state, vae) do
    case SdService.post_active_vae(vae) do
      {:ok, options} ->
        state |> Map.put(:options, options)

      {:error, _} ->
        state
    end
  end

  defp handle_generation_error(%{"error" => error}, backend: :comfy) do
    handle_generation_error(error, backend: :comfy)
  end

  defp handle_generation_error(error, backend: :comfy) when is_binary(error) do
    handle_generation_error(%{message: error})
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

  def put_progress(%{backend: :comfy} = state), do: state

  def put_progress(
        %{task: task, generating_session_name: generating_session_name, backend: backend} = state
      )
      when not is_nil(task) do
    case SdService.get_progress(backend) do
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

  def free_memory() do
    GenServer.cast(__MODULE__, :free_memory)
  end

  def get_memory_usage() do
    GenServer.cast(__MODULE__, :memory)
  end

  @spec get_samplers :: {:ok, list()}
  def get_samplers() do
    GenServer.cast(__MODULE__, :samplers)
  end

  @spec get_models :: {:ok, list()}
  def get_models() do
    GenServer.cast(__MODULE__, :models)
  end

  @spec get_vaes :: {:ok, list()}
  def get_vaes() do
    GenServer.cast(__MODULE__, :vaes)
  end

  @spec get_schedulers :: {:ok, list()}
  def get_schedulers() do
    GenServer.cast(__MODULE__, :schedulers)
  end

  @spec get_scripts :: {:ok, map()}
  def get_scripts() do
    GenServer.cast(__MODULE__, :scripts)
  end

  @spec get_upscalers :: {:ok, list()}
  def get_upscalers() do
    GenServer.cast(__MODULE__, :upscalers)
  end

  @spec get_loras :: {:ok, list()}
  def get_loras() do
    GenServer.cast(__MODULE__, :loras)
  end

  @spec get_embeddings :: {:ok, map()}
  def get_embeddings() do
    GenServer.cast(__MODULE__, :embeddings)
  end

  @spec get_backend(pos_integer() | nil) :: {:ok, atom()}
  def get_backend(timeout \\ 5000) do
    try do
      GenServer.call(__MODULE__, :backend, timeout)
    catch
      :exit, _ -> {:ok, get_default_backend()}
    end
  end

  @spec get_controlnet_models :: {:ok, list(binary)}
  def get_controlnet_models() do
    GenServer.cast(__MODULE__, :controlnet_models)
  end

  @spec get_controlnet_preprocessors :: {:ok, list(binary)}
  def get_controlnet_preprocessors() do
    GenServer.cast(__MODULE__, :controlnet_preprocessors)
  end

  @spec get_options :: {:ok, map()}
  def get_options() do
    GenServer.cast(__MODULE__, :options)
  end

  def set_model(model_title) do
    GenServer.cast(__MODULE__, {:set_model, model_title})
  end

  def set_vae(vae) do
    GenServer.cast(__MODULE__, {:set_vae, vae})
  end

  def get_png_info(png_data_url) do
    GenServer.call(__MODULE__, {:get_png_info, png_data_url})
  end

  @spec get_is_connected(pos_integer() | nil) :: {:ok, boolean()}
  def get_is_connected(timeout \\ 5000) do
    try do
      GenServer.call(__MODULE__, :get_is_connected, timeout)
    catch
      :exit, _ -> {:ok, false}
    end
  end

  def set_backend(backend) do
    GenServer.cast(__MODULE__, {:set_backend, backend})
  end

  def controlnet_detect(params) do
    GenServer.cast(__MODULE__, {:controlnet_detect, params})
  end

  def stop() do
    GenServer.stop(ExSd.SdServer)
  end

  defp get_default_backend() do
    if(Application.fetch_env!(:ex_sd, :default_backend) in [:a1111, :forge],
      do: :auto,
      else: :comfy
    )
  end
end
