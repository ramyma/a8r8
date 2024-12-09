defmodule ExSd.Civit do
  require Logger
  alias ExSd.CivitConfig
  alias ExSd.Sd
  alias ExSd.CivitClient
  import Ecto.Query, only: [from: 2]

  @spec get_model_by_hash(binary(), binary()) :: {:error, binary() | map()}
  def get_model_by_hash(hash, path) do
    case CivitClient.get_model_by_hash(hash) do
      {:ok, lora} = resp ->
        stored_lora = save_lora(path, lora)

        {:ok, loras} = Sd.read_loras()

        raw_lora = Enum.find(loras, &(Map.get(&1, "path") == path))

        if raw_lora do
          backfilled_lora = Sd.backfill_lora_with_stored_metadata(raw_lora, stored_lora)

          Sd.broadcast_lora_with_metadata_item(%{
            property: "path",
            key: path,
            value: backfilled_lora
          })
        end

        resp

      resp ->
        resp
    end
  end

  @spec save_lora(binary(), map()) :: ExSd.Lora.t()
  def save_lora(path, lora) do
    Logger.info("Saving fetched lora info to DB")

    ExSd.Repo.insert!(
      %ExSd.Lora{path: path, name: lora["name"], civit_id: lora["id"], metadata: lora},
      on_conflict: :nothing
    )
  end

  @spec load_lora(binary()) :: map() | nil
  def load_lora(path) do
    ExSd.Repo.one(from l in ExSd.Lora, where: l.path == ^path)
  end

  @spec load_loras() :: [ExSd.Lora.t()]
  def load_loras() do
    ExSd.Repo.all(ExSd.Lora)
  end

  @spec load_lora_by_model_id(binary()) :: ExSd.Lora.t() | nil
  def load_lora_by_model_id(model_id) do
    ExSd.Repo.one(from l in ExSd.Lora, where: l.metadata["modelId"] == ^model_id)
  end

  @spec load_config() :: ExSd.Config.t() | nil
  def load_config() do
    ExSd.Repo.one(from c in ExSd.Config, where: c.name == ^"civit", select: c.config)
  end

  @spec get_civit_token() :: binary() | nil
  def get_civit_token() do
    Map.get(load_config() || %{}, "api_token")
  end

  @spec store_config(map) :: any()
  def store_config(civit_config) do
    with {:ok, config} <- CivitConfig.from_map(civit_config),
         {:ok, _} <-
           ExSd.Repo.insert(%ExSd.Config{name: "civit", config: config},
             on_conflict: :replace_all
           ) do
      Sd.broadcast_message("Saved", "", :success)
    else
      {:error, error} -> Sd.broadcast_error(error)
    end
  end
end
