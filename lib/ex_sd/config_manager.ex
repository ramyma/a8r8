defmodule ExSd.ConfigManager do
  @moduledoc """
  Handles configuration concerns
  """

  alias ExSd.Sd
  alias ExSd.ConfigManager.ConfigManagerServer
  import Ecto.Query, only: [from: 2]

  @spec set_config(map()) :: nil
  defdelegate set_config(config), to: ConfigManagerServer

  @spec get_config() :: map()
  def get_config() do
    config = ConfigManagerServer.get_config()
    Sd.broadcast_data("config", config)
  end

  def store_model_config(model_config) do
    with {:ok, config} <- ExSd.ModelConfig.from_map(model_config),
         {:ok, _new_config} <-
           ExSd.Repo.insert(config,
             on_conflict: :replace_all
           ) do
      Sd.broadcast_message("Saved", "", :success)
    else
      {:error, error} -> Sd.broadcast_error(error)
    end
  end

  @spec load_model_config(binary(), binary()) :: any()
  def load_model_config(model_name, backend) do
    case ExSd.Repo.one(
           from c in ExSd.ModelConfig, where: c.backend == ^backend and c.name == ^model_name
         ) do
      nil -> {:ok, nil}
      config -> {:ok, config.config}
    end
  end
end
