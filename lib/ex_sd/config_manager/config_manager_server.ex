defmodule ExSd.ConfigManager.ConfigManagerServer do
  use GenServer

  require Logger

  def start_link(init_args) do
    # you may want to register your server with `name: __MODULE__`
    # as a third argument to `start_link`
    GenServer.start_link(__MODULE__, [init_args], name: __MODULE__)
  end

  @impl true
  def init(_init_arg) do
    Logger.info("Initializing config manager")
    Logger.info("Config path: #{get_config_path()}")

    {:ok, %{}, {:continue, :fetch_config}}
  end

  @impl true
  def handle_continue(:fetch_config, state) do
    new_state =
      state
      |> merge_last_gen_config(load_last_gen_config())

    {:noreply, new_state}
  end

  @impl true
  def handle_cast({:store_last_gen_config, config}, state) do
    Logger.info("Setting new gen config")

    with :ok <- File.mkdir_p(get_config_path()),
         :ok <- File.write("#{get_last_config_path()}", Jason.encode!(config, pretty: true)) do
      {:noreply, state |> merge_last_gen_config(config)}
    else
      _ -> {:noreply, state}
    end
  end

  @impl true
  def handle_call(:retrieve_config, _, state) do
    {:reply, state, state}
  end

  @spec load_last_gen_config() :: map()
  def load_last_gen_config() do
    with {:ok, config_string} <- File.read("#{get_last_config_path()}"),
         {:ok, config} <- Jason.decode(config_string) do
      config
    else
      {:error, error} ->
        Logger.error("No last config found \"#{error}\".")

        %{}
    end
  end

  defp merge_last_gen_config(state, config) do
    state
    |> Map.merge(%{
      last_gen_config: config
    })
  end

  @spec set_config(map()) :: :ok
  def set_config(config) do
    GenServer.cast(__MODULE__, {:store_last_gen_config, config})
  end

  @spec get_config() :: map()
  def get_config() do
    GenServer.call(__MODULE__, :retrieve_config)
  end

  defp get_config_path() do
    Path.expand(Application.fetch_env!(:ex_sd, :config_path))
  end

  defp get_last_config_path() do
    Path.join(get_config_path(), "last_gen_config.json")
  end
end
