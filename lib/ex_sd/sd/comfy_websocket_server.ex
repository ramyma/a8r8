defmodule ExSd.Sd.ComfyWebsocketServer do
  use GenServer

  alias Phoenix.PubSub

  require Logger
  require Mint.HTTP

  defstruct [:conn, :websocket, :request_ref, :caller, :status, :resp_headers, :closing?]

  def connect(url) do
    with {:ok, socket} <- GenServer.start_link(__MODULE__, [], name: __MODULE__),
         {:ok, :connected} <- GenServer.call(socket, {:connect, url}) do
      {:ok, socket}
    end
  end

  def stop() do
    GenServer.stop(__MODULE__)
  end

  def send_message(text) do
    GenServer.call(__MODULE__, {:send_text, text})
  end

  @impl true
  def init([]) do
    {:ok, %__MODULE__{}}
  end

  @impl true
  def handle_call({:send_text, text}, _from, state) do
    {:ok, state} = send_frame(state, {:text, text})
    {:reply, :ok, state}
  end

  @impl true
  def handle_call({:connect, url}, from, state) do
    uri = URI.parse(url)

    http_scheme =
      case uri.scheme do
        "ws" -> :http
        "wss" -> :https
      end

    ws_scheme =
      case uri.scheme do
        "ws" -> :ws
        "wss" -> :wss
      end

    path =
      case uri.query do
        nil -> uri.path
        query -> uri.path <> "?" <> query
      end

    with {:ok, conn} <- Mint.HTTP.connect(http_scheme, uri.host, uri.port),
         {:ok, conn, ref} <- Mint.WebSocket.upgrade(ws_scheme, conn, path, []) do
      state = %{state | conn: conn, request_ref: ref, caller: from}
      {:noreply, state}
    else
      {:error, reason} ->
        {:reply, {:error, reason}, state}

      {:error, conn, reason} ->
        {:reply, {:error, reason}, put_in(state.conn, conn)}
    end
  end

  @impl GenServer
  def handle_info(message, state) do
    case Mint.WebSocket.stream(state.conn, message) do
      {:ok, conn, responses} ->
        state = put_in(state.conn, conn) |> handle_responses(responses)
        if state.closing?, do: do_close(state), else: {:noreply, state}

      {:error, conn, reason, _responses} ->
        state = put_in(state.conn, conn) |> reply({:error, reason})
        {:noreply, state}

      :unknown ->
        {:noreply, state}
    end
  end

  defp handle_responses(state, responses)

  defp handle_responses(%{request_ref: ref} = state, [{:status, ref, status} | rest]) do
    put_in(state.status, status)
    |> handle_responses(rest)
  end

  defp handle_responses(%{request_ref: ref} = state, [{:headers, ref, resp_headers} | rest]) do
    put_in(state.resp_headers, resp_headers)
    |> handle_responses(rest)
  end

  defp handle_responses(%{request_ref: ref} = state, [{:done, ref} | rest]) do
    case Mint.WebSocket.new(state.conn, ref, state.status, state.resp_headers) do
      {:ok, conn, websocket} ->
        %{state | conn: conn, websocket: websocket, status: nil, resp_headers: nil}
        |> reply({:ok, :connected})
        |> handle_responses(rest)

      {:error, conn, reason} ->
        put_in(state.conn, conn)
        |> reply({:error, reason})
    end
  end

  defp handle_responses(%{request_ref: ref, websocket: websocket} = state, [
         {:data, ref, data} | rest
       ])
       when websocket != nil do
    case Mint.WebSocket.decode(websocket, data) do
      {:ok, websocket, frames} ->
        put_in(state.websocket, websocket)
        |> handle_frames(frames)
        |> handle_responses(rest)

      {:error, websocket, reason} ->
        put_in(state.websocket, websocket)
        |> reply({:error, reason})
    end
  end

  defp handle_responses(state, [_response | rest]) do
    handle_responses(state, rest)
  end

  defp handle_responses(state, []), do: state

  defp send_frame(state, frame) do
    with {:ok, websocket, data} <- Mint.WebSocket.encode(state.websocket, frame),
         state = put_in(state.websocket, websocket),
         {:ok, conn} <- Mint.WebSocket.stream_request_body(state.conn, state.request_ref, data) do
      {:ok, put_in(state.conn, conn)}
    else
      {:error, %Mint.WebSocket{} = websocket, reason} ->
        {:error, put_in(state.websocket, websocket), reason}

      {:error, conn, reason} ->
        {:error, put_in(state.conn, conn), reason}
    end
  end

  def handle_frames(state, frames) do
    Enum.reduce(frames, state, fn
      # reply to pings with pongs
      {:ping, data}, state ->
        {:ok, state} = send_frame(state, {:pong, data})
        state

      {:close, _code, reason}, state ->
        Logger.debug("Closing connection: #{inspect(reason)}")
        %{state | closing?: true}

      {:text, text}, state ->
        # filter out crystool debug messages
        if !String.contains?(text, "crystools.monitor") do
          Logger.debug("Received: #{inspect(text)}")
        else
          process_monitor_data(text)
        end

        response = Jason.decode!(text)

        case Map.get(response, "type") do
          "progress" ->
            progress =
              round(get_in(response, ["data", "value"]) / get_in(response, ["data", "max"]) * 100)

            PubSub.broadcast!(
              ExSd.PubSub,
              "generation",
              {:progress, progress}
            )

          "executing" ->
            node_name = get_in(response, ["data", "node"])

            if not is_nil(node_name) and
                 (node_name == "model" or Regex.match?(~r/cn\d+_controlnet_loader/i, node_name)) do
              PubSub.broadcast!(
                ExSd.PubSub,
                "comfy",
                :loading_model
              )
            end

          "executed" ->
            node_name = get_in(response, ["data", "node"])

            if node_name == "output" do
              output = get_in(response, ["data", "output"])

              PubSub.broadcast!(
                ExSd.PubSub,
                "comfy",
                {:generation_complete, output}
              )
            end

          "execution_error" ->
            exception_message = get_in(response, ["data", "exception_message"])

            PubSub.broadcast!(
              ExSd.PubSub,
              "comfy",
              {:error, exception_message}
            )

          "execution_start" ->
            PubSub.broadcast!(
              ExSd.PubSub,
              "comfy",
              :execution_start
            )

          "execution_cached" ->
            cached_nodes = get_in(response, ["data", "nodes"])

            if(Enum.member?(cached_nodes, "output"),
              do:
                PubSub.broadcast!(
                  ExSd.PubSub,
                  "comfy",
                  :generation_cached
                )
            )

          _ ->
            nil
        end

        # {:ok, state} = send_frame(state, {:text, String.reverse(text)})
        state

      {:binary, data}, state ->
        Logger.debug("Received binary")

        <<_event_type::bytes-4, _image_type::bytes-4, image_binary::bitstring>> = data

        image_base64_string = Base.encode64(image_binary)

        PubSub.broadcast!(
          ExSd.PubSub,
          "generation",
          {:progress_preview, image_base64_string}
        )

        state

      frame, state ->
        Logger.debug("Unexpected frame received: #{inspect(frame)}")
        state
    end)
  end

  defp do_close(state) do
    # Streaming a close frame may fail if the server has already closed
    # for writing.
    _ = send_frame(state, :close)
    Mint.HTTP.close(state.conn)

    Logger.info("Comfy websocket closed")
    {:stop, :normal, state}
  end

  defp reply(state, response) do
    if state.caller, do: GenServer.reply(state.caller, response)
    put_in(state.caller, nil)
  end

  defp process_monitor_data(text) do
    with {:ok, resp} <- Jason.decode(text),
         data <- Map.get(resp, "data", %{}) do
      gpus =
        Map.get(data, "gpus", [])

      vram_usage_percentage =
        (Enum.map(gpus, & &1["vram_used_percent"]) |> Enum.sum()) / length(gpus)

      ram_usage_percentage =
        Map.get(data, "ram_used_percent")

      if(ram_usage_percentage && vram_usage_percentage,
        do:
          ExSd.Sd.broadcast_memory_stats(%ExSd.Sd.MemoryStats{
            cuda_usage: vram_usage_percentage,
            ram_usage: ram_usage_percentage
          })
      )
    end
  end
end
