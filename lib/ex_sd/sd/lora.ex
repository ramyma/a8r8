defmodule ExSd.Lora do
  use Ecto.Schema
  import Ecto.Changeset

  @derive {Jason.Encoder, except: [:__meta__]}
  @primary_key {:path, :string, autogenerate: false}
  schema "loras" do
    field :civit_id, :id
    field :name, :string
    field :metadata, :map

    timestamps()
  end

  @doc false
  def changeset(lora, attrs) do
    lora
    |> cast(attrs, [:id, :name, :path, :metadata])
    |> validate_required([:name, :path])
  end
end
