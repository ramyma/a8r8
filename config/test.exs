import Config

# Configure your database
#
# The MIX_TEST_PARTITION environment variable can be used
# to provide built-in test partitioning in CI environment.
# Run `mix help test` for more information.
# config :ex_sd, ExSd.Repo,
#   username: "postgres",
#   password: "postgres",
#   hostname: "localhost",
#   database: "ex_sd_test#{System.get_env("MIX_TEST_PARTITION")}",
#   pool: Ecto.Adapters.SQL.Sandbox,
#   pool_size: 10

# We don't run a server during test. If one is required,
# you can enable the server option below.
config :ex_sd, ExSdWeb.Endpoint,
  http: [ip: {127, 0, 0, 1}, port: 4002],
  secret_key_base: "lqdBZiHbEP2sSH3yJ51HNon1nYhA8CrkUuAuBH3Ipcb+/Vs68SXRQrCwh8xhnh/Z",
  server: false

# In test we don't send emails.
config :ex_sd, ExSd.Mailer, adapter: Swoosh.Adapters.Test

# Disable swoosh api client as it is only required for production adapters.
config :swoosh, :api_client, false

# Print only warnings and errors during test
config :logger, level: :warning

# Initialize plugs at runtime for faster test compilation
config :phoenix, :plug_init_mode, :runtime

config :ex_sd, :auto_client_base_url, "http://localhost:7860"
