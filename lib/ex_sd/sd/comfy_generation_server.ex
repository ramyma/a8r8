defmodule ExSd.ComfyGenerationServer do
  require Logger
  alias Phoenix.PubSub
  alias ExSd.ComfyClient
  alias ExSd.Sd.ComfyWebsocketServer
  use GenServer

  def start_link(init_args) do
    GenServer.start_link(__MODULE__, [init_args], name: __MODULE__)
  end

  @impl true
  def init(_args) do
    client_id = Ecto.UUID.generate()

    Phoenix.PubSub.subscribe(ExSd.PubSub, "comfy")
    Phoenix.PubSub.subscribe(ExSd.PubSub, "sd_server")

    {:ok,
     %{
       flow: [],
       current_flow_item: 0,
       prompt_id: nil,
       client_id: client_id,
       attrs: nil,
       dimensions: nil
     }, {:continue, :init}}
  end

  @impl true
  def handle_continue(:init, %{client_id: client_id} = state) do
    sd_server_pid = GenServer.whereis(ExSd.SdServer)

    %{backend: backend, is_connected: is_connected} =
      if not is_nil(sd_server_pid) and Process.alive?(sd_server_pid),
        do: :sys.get_state(GenServer.whereis(ExSd.SdServer)),
        else: %{backend: "auto", is_connected: false}

    if(backend == :comfy and is_connected,
      do: connect_to_websocket(client_id)
    )

    {:noreply, state}
  end

  @impl true
  def handle_cast({:start_flow, flow, attrs, dimensions}, state) do
    Logger.info("Starting flow")

    Process.send(self(), :generate, [])

    {:noreply,
     %{
       state
       | flow: flow,
         current_flow_item: 0,
         prompt_id: nil,
         attrs: attrs,
         dimensions: dimensions
     }}
  end

  @impl true
  def handle_info(
        :generate,
        %{flow: flow, current_flow_item: current_flow_item, client_id: client_id, attrs: attrs} =
          state
      ) do
    flow_item = Enum.at(flow, current_flow_item)

    case ComfyClient.generate_image(flow_item.generation_params, attrs, client_id) do
      {:ok, _prompt_id} ->
        :ok

      {:error, error} ->
        PubSub.broadcast!(
          ExSd.PubSub,
          "generation",
          {:generation_error, error}
        )
    end

    {:noreply, %{state | current_flow_item: current_flow_item, attrs: attrs}}
  end

  @impl true
  def handle_info(
        {:generation_complete, output},
        %{
          current_flow_item: current_flow_item,
          flow: flow,
          attrs: attrs,
          dimensions: dimensions
        } = state
      ) do
    if current_flow_item == length(flow) - 1 do
      Logger.info("Flow complete")

      # filename =
      #   output
      #   |> Map.get("images")
      #   |> Enum.map(&Map.get(&1, "filename"))
      #   |> List.first()

      # # {:ok, filename} = ComfyClient.get_history(prompt_id)
      # {:ok, image_base64} = ComfyClient.get_image(filename)

      # FIXME: handle nils on concecative dwpose runs
      image_base64 =
        output
        |> Map.get("images")
        |> List.first()

      PubSub.broadcast!(
        ExSd.PubSub,
        "generation",
        {:generation_complete,
         %{
           image: image_base64,
           attrs: attrs,
           dimensions: dimensions,
           flow: Enum.at(flow, current_flow_item)
         }}
      )

      {:noreply,
       %{state | flow: [], current_flow_item: 0, prompt_id: nil, attrs: nil, dimensions: nil}}
    else
      Process.send(self(), :generate, [])
      {:noreply, %{state | current_flow_item: current_flow_item + 1}}
    end
  end

  @impl true
  def handle_info(
        :generation_cached,
        %{
          current_flow_item: current_flow_item,
          flow: flow,
          attrs: _attrs,
          dimensions: _dimensions
        } = state
      ) do
    if current_flow_item == length(flow) - 1 do
      Logger.info("Flow cached")

      PubSub.broadcast!(
        ExSd.PubSub,
        "generation",
        :generation_cached
      )

      {:noreply,
       %{state | flow: [], current_flow_item: 0, prompt_id: nil, attrs: nil, dimensions: nil}}
    else
      Process.send(self(), :generate, [])
      {:noreply, %{state | current_flow_item: current_flow_item + 1}}
    end
  end

  @impl true
  def handle_info(
        {:error, error_message},
        %{
          current_flow_item: _current_flow_item,
          flow: _flow,
          attrs: _attrs,
          dimensions: _dimensions
        } = state
      ) do
    PubSub.broadcast!(
      ExSd.PubSub,
      "generation",
      {:generation_error, error_message |> tap(&Logger.debug(&1))}
    )

    {:noreply, %{state | flow: [], current_flow_item: 0, prompt_id: nil}}
  end

  @impl true
  def handle_info({:backend_change, :comfy}, %{client_id: client_id} = state) do
    connect_to_websocket(client_id)
    {:noreply, state}
  end

  @impl true
  def handle_info(
        {:backend_connection, :comfy, true = _is_connected},
        %{client_id: client_id} = state
      ) do
    connect_to_websocket(client_id)
    {:noreply, state}
  end

  @impl true
  def handle_info(
        {:backend_connection, :comfy, false = _is_connected},
        state
      ) do
    stop_websockets_server()
    {:noreply, state}
  end

  @impl true
  def handle_info(
        {:backend_change, backend},
        state
      )
      when backend != :comfy do
    stop_websockets_server()
    {:noreply, state}
  end

  @impl true
  def handle_info(_unknown_message, state) do
    {:noreply, state}
  end

  defp connect_to_websocket(client_id) do
    %{host: host, port: port} = URI.parse(ExSd.ComfyClient.get_base_url())

    case ComfyWebsocketServer.connect("ws://#{host}:#{port}/ws?clientId=#{client_id}") do
      {:ok, _} ->
        Logger.info("Connected to Comfy")
        :ok

      {:error, {:already_started, _}} ->
        Logger.info("Already connected to Comfy")
        :ok

      error ->
        error
    end
  end

  defp stop_websockets_server() do
    if(GenServer.whereis(ComfyWebsocketServer), do: ComfyWebsocketServer.stop())
  end

  @spec start_flow(list(), map(), map()) :: :ok
  def start_flow(flow, attrs, dimensions) do
    GenServer.cast(__MODULE__, {:start_flow, flow, attrs, dimensions})
  end
end
