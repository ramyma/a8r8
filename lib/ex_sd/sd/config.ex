defmodule ExSd.Config do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:name, :binary, autogenerate: false}
  schema "config" do
    field :config, :map

    timestamps()
  end

  @doc false
  def changeset(user, attrs) do
    user
    |> cast(attrs, [:name, :config])
    |> validate_required([:name, :config])
  end
end
