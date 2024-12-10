defmodule ExSd.CivitConfig do
  use Ecto.Schema
  import Ecto.Changeset

  @derive {Jason.Encoder, except: []}

  @primary_key false
  embedded_schema do
    field :api_token, :string
  end

  @doc false
  def changeset(config, attrs) do
    config
    |> cast(attrs, [:api_token])
  end

  def from_map(map) do
    {:ok,
     changeset(%__MODULE__{}, map)
     |> Ecto.Changeset.apply_changes()}
  end
end
