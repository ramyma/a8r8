defmodule ExSd.Repo do
  use Ecto.Repo,
    otp_app: :ex_sd,
    adapter: Ecto.Adapters.Postgres
end
