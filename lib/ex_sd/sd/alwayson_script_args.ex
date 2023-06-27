defmodule ExSd.Sd.AlwaysonScriptArgs do
  use Ecto.Schema
  import Ecto.Changeset

  @derive {Jason.Encoder, except: []}

  @primary_key false
  embedded_schema do
    field :args, {:array, :any}
  end

  def changeset(%__MODULE__{} = tiled_diffusion, attrs) do
    tiled_diffusion
    |> cast(
      attrs,
      [:args]
    )
  end
end
