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

  @spec get_clip_models :: {:ok, list(binary())}
  defdelegate get_clip_models(), to: SdServer

  @spec get_unets :: {:ok, list()}
  defdelegate get_unets(), to: SdServer

  @spec get_vaes :: {:ok, list()}
  defdelegate get_vaes(), to: SdServer

  @spec get_schedulers :: {:ok, list()}
  defdelegate get_schedulers(), to: SdServer

  @spec get_scripts :: {:ok, map()}
  defdelegate get_scripts(), to: SdServer

  @spec get_upscalers :: {:ok, list()}
  defdelegate get_upscalers(), to: SdServer

  @spec get_loras(keyword()) :: :ok
  defdelegate get_loras(options \\ []), to: SdServer

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

  defdelegate set_model(model), to: SdServer

  defdelegate set_vae(vae), to: SdServer

  defdelegate set_additional_modules(additional_modules), to: SdServer

  @spec set_backend(binary()) :: any
  defdelegate set_backend(backend), to: SdServer

  defdelegate get_png_info(png_data_url), to: SdServer

  defdelegate controlnet_detect(params), to: SdServer

  @spec read_loras() :: {:ok, list()} | {:error, any}
  defdelegate read_loras(), to: SdServer

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

  @spec broadcast_data_item(binary(), %{property: binary(), key: binary(), value: any()}) ::
          :ok
  def broadcast_data_item(name, data) do
    ExSdWeb.Endpoint.broadcast!("sd", "item_update_#{name}", %{data: data})
  end

  def broadcast_backend(backend) do
    ExSdWeb.Endpoint.broadcast!("sd", "backend", %{backend: backend})
  end

  def broadcast_loras_with_metadata(loras_with_metadata) do
    broadcast_data("loras_with_metadata", loras_with_metadata)
  end

  def broadcast_lora_with_metadata_item(lora_with_metadata) do
    broadcast_data_item("loras_with_metadata", lora_with_metadata)
  end

  defp ls_r!(path) do
    cond do
      File.regular?(path) ->
        [path]

      File.dir?(path) ->
        File.ls!(path)
        |> Enum.map(&Path.join(path, &1))
        |> Enum.map(&ls_r!/1)
        |> Enum.concat()

      true ->
        []
    end
  end

  def load_loras_from_files(lora_dir_path) do
    loras = ExSd.Civit.load_loras()

    lora_by_path =
      loras |> Enum.reduce(%{}, fn lora, acc -> Map.merge(acc, %{lora.path => lora}) end)

    loras =
      ls_r!(lora_dir_path)
      |> Enum.filter(&String.match?(&1, ~r/^\S*\.safetensors$/i))
      |> Enum.map(fn item ->
        io_device =
          File.open!(
            item,
            [:read]
          )

        n =
          io_device
          |> IO.binread(8)
          |> :binary.decode_unsigned(:little)

        metadata =
          io_device
          |> IO.binread(n)
          |> Jason.decode!()
          |> Map.get("__metadata__")

        # %{
        #   hash: metadata["sshs_model_hash"],
        #   model_name: metadata["ss_sd_model_name"],
        #   name: metadata["ss_output_name"] || item |> Path.basename()
        # }
        stored_lora = lora_by_path[item]

        %{
          alias:
            (get_in(stored_lora || %{}, [
               Access.key(:metadata),
               Access.key("model"),
               Access.key("name")
             ]) ||
               "") <>
              Map.get(stored_lora || %{}, :name, ""),
          # TODO: remove only the lora base path
          name: item |> Path.basename(),
          path: item,
          metadata: metadata || %{},
          stored_metadata: Map.get(stored_lora || %{}, :metadata)
        }
      end)
      |> Enum.sort(&(String.downcase(&1.name) < String.downcase(&2.name)))

    broadcast_loras_with_metadata(loras)
  end

  def backfill_lora_with_stored_metadata(lora, stored_lora) do
    stored_metadata = Map.get(stored_lora || %{}, :metadata)

    %{
      alias:
        String.trim(
          (get_in(stored_lora || %{}, [
             Access.key(:metadata),
             Access.key("model"),
             Access.key("name")
           ]) ||
             " ") <>
            " " <>
            Map.get(stored_lora || %{}, :name, "")
        ),
      # TODO: remove only the lora base path
      name: Map.get(lora, "name", ""),
      path: Map.get(lora, "path", ""),
      metadata: Map.get(lora, "metadata") || %{},
      stored_metadata: stored_metadata,
      model_type: get_lora_model_type(lora, stored_metadata)
    }
  end

  @spec load_loras() :: :ok
  def load_loras() do
    loras = ExSd.Civit.load_loras()

    lora_by_path =
      loras |> Enum.reduce(%{}, fn lora, acc -> Map.merge(acc, %{lora.path => lora}) end)

    with :ok <- get_loras(broadcast: false), {:ok, loras} <- read_loras() do
      loras =
        loras
        |> Enum.map(fn lora ->
          stored_lora = lora_by_path[lora["path"]]

          backfill_lora_with_stored_metadata(lora, stored_lora)
        end)
        |> Enum.sort(&(String.downcase(&1.name) < String.downcase(&2.name)))

      broadcast_loras_with_metadata(loras)
    else
      {:error, error} ->
        Logger.error(error)
    end
  end

  defp get_lora_model_type(lora, stored_metadata) do
    cond do
      is_pony_lora?(lora, stored_metadata) ->
        "pony"

      is_sdxl_lora?(lora, stored_metadata) ->
        "sdxl"

      is_flux_lora?(lora, stored_metadata) ->
        "flux"

      is_sd35_lora?(lora, stored_metadata) ->
        "sd3.5"

      true ->
        "sd1.5"
    end
  end

  defp match_lora_model?(lora, model_pattern, stored_metadata) do
    (Map.get(stored_metadata || %{}, "baseModel") || Map.get(lora, "name") || "")
    |> String.downcase()
    |> String.contains?(model_pattern) ||
      (get_in(lora, ["metadata", "ss_sd_model_name"]) || "")
      |> String.downcase()
      |> String.contains?(model_pattern) ||
      (get_in(lora, ["metadata", "ss_base_model_version"]) || "")
      |> String.downcase()
      |> String.contains?(model_pattern)
  end

  defp is_pony_lora?(lora, stored_metadata) do
    match_lora_model?(lora, "pony", stored_metadata)
  end

  defp is_sdxl_lora?(lora, stored_metadata) do
    match_lora_model?(lora, "xl", stored_metadata)
  end

  defp is_sd35_lora?(lora, stored_metadata) do
    match_lora_model?(lora, ["35", "3.5"], stored_metadata)
  end

  defp is_flux_lora?(lora, stored_metadata) do
    match_lora_model?(lora, "flux", stored_metadata)
  end
end
