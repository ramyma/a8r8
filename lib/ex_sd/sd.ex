defmodule ExSd.Sd do
  require Logger
  alias ExSd.Sd.MemoryStats
  alias ExSd.Sd.GenerationParams
  alias ExSd.SdServer

  def change_generation_params(%GenerationParams{} = generation_params, attrs \\ %{}) do
    GenerationParams.changeset(generation_params, attrs)
  end

  def generate(%{} = generation_params, attrs, session_name) do
    SdServer.generate(
      change_generation_params(
        %GenerationParams{},
        generation_params
      )
      |> Ecto.Changeset.apply_changes(),
      attrs,
      session_name
    )
  end

  # @spec generate(GenerationParams.t(), map()) :: :ok
  # def generate(%GenerationParams{} = generation_params, attrs) do
  #   SdServer.generate(generation_params, attrs)
  # end

  defdelegate interrupt(), to: SdServer

  defdelegate free_memory(), to: SdServer

  defdelegate get_memory_usage(), to: SdServer
  @spec get_samplers :: {:ok, list(String.t())}
  defdelegate get_samplers(), to: SdServer

  defdelegate get_is_connected(), to: SdServer

  @spec get_models :: {:ok, list()}
  defdelegate get_models(), to: SdServer

  @spec get_vaes :: {:ok, list()}
  defdelegate get_vaes(), to: SdServer

  @spec get_schedulers :: {:ok, list()}
  defdelegate get_schedulers(), to: SdServer

  @spec get_scripts :: {:ok, map()}
  defdelegate get_scripts(), to: SdServer

  @spec get_upscalers :: {:ok, list()}
  defdelegate get_upscalers(), to: SdServer

  @spec get_loras :: {:ok, list()}
  defdelegate get_loras(), to: SdServer

  @spec get_embeddings :: {:ok, map()}
  defdelegate get_embeddings, to: SdServer

  @spec get_backend :: {:ok, binary()}
  defdelegate get_backend, to: SdServer

  @spec get_controlnet_models :: {:ok, list(binary)}
  defdelegate get_controlnet_models(), to: SdServer

  @spec get_controlnet_preprocessors :: {:ok, list}
  defdelegate get_controlnet_preprocessors(), to: SdServer

  @spec get_union_controlnet_types :: {:ok, list}
  defdelegate get_union_controlnet_types(), to: SdServer

  @spec get_ip_adapter_models :: {:ok, map()}
  defdelegate get_ip_adapter_models(), to: SdServer

  @spec get_options :: {:ok, map()}
  defdelegate get_options(), to: SdServer

  defdelegate set_model(model_title), to: SdServer

  defdelegate set_vae(vae), to: SdServer

  @spec set_backend(binary()) :: any
  defdelegate set_backend(backend), to: SdServer

  defdelegate get_png_info(png_data_url), to: SdServer

  defdelegate controlnet_detect(params), to: SdServer

  @spec broadcast_memory_stats(MemoryStats.t()) :: :ok
  def broadcast_memory_stats(memory_stats) do
    ExSdWeb.Endpoint.broadcast!("sd", "memory", memory_stats)
  end

  def broadcast_connection_status(is_connected) do
    ExSdWeb.Endpoint.broadcast!("sd", "is_connected", is_connected)
  end

  def broadcast_progress(progress) do
    ExSdWeb.Endpoint.broadcast!("sd", "progress", progress)
  end

  def broadcast_samplers(samplers) do
    ExSdWeb.Endpoint.broadcast!("sd", "samplers", %{samplers: samplers})
  end

  def broadcast_generated_image(data) do
    ExSdWeb.Endpoint.broadcast!("sd", "image", data)
  end

  @spec broadcast_message(binary(), binary(), :error | :warning | :info | :success) :: :ok
  def broadcast_message(title, body \\ "", type \\ :info) do
    ExSdWeb.Endpoint.broadcast!("sd", "message", %{
      message: %{title: title, body: body, type: type}
    })
  end

  def broadcast_model_loading_status(is_model_loading) do
    ExSdWeb.Endpoint.broadcast!("sd", "is_model_loading", %{is_model_loading: is_model_loading})
  end

  def broadcast_vae_loading_status(is_vae_loading) do
    ExSdWeb.Endpoint.broadcast!("sd", "is_vae_loading", %{is_vae_loading: is_vae_loading})
  end

  @spec broadcast_controlenet_detection([binary()], binary()) :: :ok
  def broadcast_controlenet_detection(detection_images, layer_id) do
    ExSdWeb.Endpoint.broadcast!("sd", "controlnet_detection", %{
      images: detection_images,
      layerId: layer_id
    })
  end

  def broadcast_error(error) do
    ExSdWeb.Endpoint.broadcast!("sd", "error", error)
  end

  def broadcast_data(name, data) do
    ExSdWeb.Endpoint.broadcast!("sd", "update_#{name}", %{data: data})
  end

  def broadcast_backend(backend) do
    ExSdWeb.Endpoint.broadcast!("sd", "backend", %{backend: backend})
  end

  def load_loras(lora_dir_path) do
    File.ls!(lora_dir_path)
    |> Enum.filter(&String.match?(&1, ~r/^.*\.safetensors$/))
    |> Enum.map(fn item ->
      io_device =
        File.open!(
          lora_dir_path <> item,
          [:read]
        )

      n =
        io_device
        |> IO.binread(8)
        |> :binary.decode_unsigned(:little)

      io_device
      |> IO.binread(n)
      |> Jason.decode!()
      |> Map.get("__metadata__")
    end)
  end
end
