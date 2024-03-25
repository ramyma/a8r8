defmodule ExSd.MixProject do
  use Mix.Project

  def project do
    [
      app: :ex_sd,
      version: "0.2.0",
      elixir: "~> 1.15",
      elixirc_paths: elixirc_paths(Mix.env()),
      start_permanent: Mix.env() == :prod,
      aliases: aliases(),
      deps: deps()
    ]
  end

  # Configuration for the OTP application.
  #
  # Type `mix help compile.app` for more information.
  def application do
    [
      mod: {ExSd.Application, []},
      extra_applications: [:logger, :runtime_tools]
    ]
  end

  # Specifies which paths to compile per environment.
  defp elixirc_paths(:test), do: ["lib", "test/support"]
  defp elixirc_paths(_), do: ["lib"]

  # Specifies your project dependencies.
  #
  # Type `mix help deps` for examples and options.
  defp deps do
    [
      {:phoenix, "~> 1.7.10", override: true},
      {:phoenix_ecto, "~> 4.4"},
      {:ecto_sql, "~> 3.11"},
      {:postgrex, ">= 0.0.0"},
      {:phoenix_html, "~> 3.3"},
      {:phoenix_live_reload, "~> 1.4", only: :dev},
      {:phoenix_live_view, "~> 0.18.16"},
      {:heroicons, "~> 0.5"},
      {:floki, ">= 0.35.2", only: :test},
      {:phoenix_live_dashboard, "~> 0.7.2"},
      # {:esbuild, "~> 0.5", runtime: Mix.env() == :dev},
      # {:tailwind, "~> 0.1.8", runtime: Mix.env() == :dev},
      {:swoosh, "~> 1.3"},
      {:finch, "~> 0.16"},
      {:telemetry_metrics, "~> 0.6"},
      {:telemetry_poller, "~> 1.0"},
      {:gettext, "~> 0.20"},
      {:jason, "~> 1.4"},
      # {:plug_cowboy, "~> 2.5"},
      {:bandit, "~> 1.1"},
      {:credo, "~> 1.7", only: [:dev, :test], runtime: false},
      {:ex_url, "~> 2.0"},
      {:image, "~> 0.43"},
      {:nx, "~> 0.7"},
      {:dialyxir, "~> 1.4", only: [:dev], runtime: false},
      {:grpc, "~> 0.7"},
      {:protobuf, "~> 0.12"},
      # {:mint, "~> 1.4.2"}
      # {:bumblebee, "~> 0.2"},
      # {:exla, "~> 0.6"},
      # {:ortex, "~> 0.1.8"},
      {:mint_web_socket, "~> 1.0"},
      # {:evision, "~> 0.1.29"},
      {:mix_test_watch, "~> 1.0", only: [:dev, :test], runtime: false},
      {:mix_test_interactive, "~> 1.0", only: :dev, runtime: false}
    ]
  end

  # Aliases are shortcuts or tasks specific to the current project.
  # For example, to install project dependencies and perform other setup tasks, run:
  #
  #     $ mix setup
  #
  # See the documentation for `Mix` for more info on aliases.
  defp aliases do
    [
      setup: ["deps.get", "ecto.setup"],
      "ecto.setup": ["ecto.create", "ecto.migrate", "run priv/repo/seeds.exs"],
      "ecto.reset": ["ecto.drop", "ecto.setup"],
      # test: ["ecto.create --quiet", "ecto.migrate --quiet", "test"],
      test: ["test"],
      "assets.deploy": ["tailwind default --minify", "esbuild default --minify", "phx.digest"]
    ]
  end
end
