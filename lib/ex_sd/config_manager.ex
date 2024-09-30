defmodule ExSd.ConfigManager do
  @moduledoc """
  Handles configuration concerns
  """

  alias ExSd.ConfigManager.ConfigManagerServer

  @spec set_config(map()) :: nil
  defdelegate set_config(config), to: ConfigManagerServer

  @spec get_config() :: map()
  defdelegate get_config(), to: ConfigManagerServer
end
