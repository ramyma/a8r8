defmodule ExSd.ModelConfig do
  use Ecto.Schema
  import Ecto.Changeset

  @derive {Jason.Encoder, except: [:__meta__]}

  @primary_key false
  schema "models_config" do
    field :name, :string, primary_key: true
    field :backend, :string, primary_key: true
    field :config, :map

    timestamps()
  end

  @doc false
  def changeset(lora, attrs) do
    lora
    |> cast(attrs, [:name, :backend, :config])
    |> validate_required([:name, :backend])
  end

  def from_map(map) do
    {:ok,
     changeset(%__MODULE__{}, map)
     |> Ecto.Changeset.apply_changes()}
  end
end
