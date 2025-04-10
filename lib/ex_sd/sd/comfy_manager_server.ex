defmodule ExSd.ComfyManagerServer do
  alias ExSd.Sd
  alias ExSd.ComfyClient
  alias ExSd.Sd.SdService
  require Logger

  use GenServer

  def start_link(init_args) do
    GenServer.start_link(__MODULE__, [init_args], name: __MODULE__)
  end

  @impl true
  def init(_args) do
    Phoenix.PubSub.subscribe(ExSd.PubSub, "comfy_manager")
    Phoenix.PubSub.subscribe(ExSd.PubSub, "sd_server")

    {:ok,
     %{
       status: "idle",
       installed_extensions: []
     }}
  end

  def handle_cast(:status, state) do
    Sd.broadcast_comfy_manager_status(Map.get(state, :status))
    {:noreply, state}
  end

  @impl true
  def handle_cast({:install_extensions, extensions}, state) do
    new_status =
      if extensions && not Enum.empty?(extensions) do
        queued? =
          Enum.reduce(extensions, true, fn ext, acc ->
            Logger.info("Comfy Manager: queuing #{ext} for installation")

            case ComfyClient.queue_install_extension(ext) do
              {:error, error} ->
                Sd.broadcast_error(%{error: error})
                acc and false

              _ ->
                acc and true
            end
          end)

        if queued? do
          Logger.info("Comfy Manager: start extension installation queue")
          ComfyClient.start_install_queue()
          new_status = "processing"

          Sd.broadcast_comfy_manager_status(new_status)

          new_status
        else
          Logger.info("Comfy Manager: failed to queue extension installation")
          "error"
        end
      else
        state[:status]
      end

    {:noreply, %{state | status: new_status}}
  end

  @impl true
  def handle_call(:extensions, _, state) do
    updated_state = put_and_broadcast_extensions(state)
    {:reply, {:ok, updated_state |> Map.get(:installed_extensions)}, updated_state}
  end

  @impl true
  def handle_info(
        {:backend_connection, :comfy, true = _is_connected},
        state
      ) do
    {:ok, response} = ComfyClient.get_manager_queue_status()

    is_manager_processing = Map.get(response, "is_processing", false)

    new_status = if(is_manager_processing, do: "processing", else: "idle")

    Sd.broadcast_comfy_manager_status(new_status)
    {:noreply, %{state | status: new_status}}
  end

  @impl true
  def handle_info({:queue_status, queue_status}, state) do
    # formatted_status = status |> String.replace("_", " ")

    nodepack_result = get_in(queue_status, ["nodepack_result", "null"])

    status =
      if nodepack_result do
        ExSd.Sd.broadcast_message(
          "Comfy Manager",
          String.capitalize("#{nodepack_result}"),
          if(nodepack_result == "success", do: :success, else: :error)
        )

        new_status = if(nodepack_result == "success", do: "success", else: "error")

        Sd.broadcast_comfy_manager_status(new_status)

        new_status
      else
        # ExSd.Sd.broadcast_message(
        #   "Comfy Manager",
        #   "Queue: #{formatted_status}",
        #   if(status == "done", do: :success, else: :warning)
        # )

        state[:status]
      end

    {:noreply, %{state | status: status}}
  end

  @impl true
  def handle_info(_, state) do
    {:noreply, state}
  end

  defp put_and_broadcast_extensions(state) do
    case SdService.get_extensions(:comfy) do
      {:ok, extensions} ->
        extensions =
          extensions
          |> Map.to_list()
          |> Enum.reduce(%{}, fn {k, v}, acc ->
            Map.put(acc, String.downcase(k), v)
          end)

        ExSd.Sd.broadcast_data("extensions", extensions)
        state |> Map.put(:installed_extensions, extensions)

      {:error, error} ->
        Logger.error(error)
        state
    end
  end

  @spec get_extensions(pos_integer() | nil) :: {:ok, atom()}
  def get_extensions(timeout \\ 5000) do
    GenServer.call(__MODULE__, :extensions, timeout)
  end

  @spec install_extensions(list(binary())) :: nil
  def install_extensions(extensions) do
    GenServer.cast(__MODULE__, {:install_extensions, extensions})
  end

  @spec get_comfy_manager_status() :: nil
  def get_comfy_manager_status() do
    GenServer.cast(__MODULE__, :status)
  end

  def restart_comfy() do
    ComfyClient.restart()
  end
end
