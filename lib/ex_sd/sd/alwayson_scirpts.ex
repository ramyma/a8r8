defmodule ExSd.Sd.AlwaysOnScript do
  import Ecto.Changeset
  use Ecto.Schema
  alias ExSd.Sd.{AlwaysonScriptArgs, ControlNet}

  @derive {Jason.Encoder, except: []}

  @primary_key false
  embedded_schema do
    embeds_one :controlnet, ControlNet
    embeds_one :"Tiled VAE", AlwaysonScriptArgs
    embeds_one :"Tiled Diffusion", AlwaysonScriptArgs
    embeds_one :"self attention guidance", AlwaysonScriptArgs
  end

  # defstruct args: [%ControlNet{}]

  # @types %{
  #   args: {:array, ControlnetUnitType}
  # }
  # def changeset(%__MODULE__{} = alwayson_script, attrs \\ %{}) do
  #   {alwayson_script, @types}
  #   # |> Map.from_struct()
  #   |> cast(attrs, [])
  #   |> cast(:args, Map.get(attrs, :address), &cast_args/2)
  # end

  # defp cast_args(_args, _params) do
  #   []
  # end
  def changeset(%__MODULE__{} = alwayson_script, params \\ %{}) do
    alwayson_script
    |> cast(params, [])
    |> cast_embed(:controlnet)
    |> cast_embed(:"Tiled VAE")
    |> cast_embed(:"Tiled Diffusion")
    |> cast_embed(:"self attention guidance")
  end
end
