defmodule ExSd.Sd.ControlNetArgs do
  use Ecto.Schema
  import Ecto.Changeset
  @derive {Jason.Encoder, except: []}

  # @type t :: %__MODULE__{
  #         mask: String.t(),
  #         comments: [MyApp.Comment.t()]
  #       }
  @primary_key false
  embedded_schema do
    field :enabled, :boolean, default: true
    field :image, :string, default: ""
    field :mask, :string, default: nil
    field :mask_image, :string, default: nil
    field :effective_region_mask, :string, default: nil
    # module: "none",
    field :model, :string
    field :module, :string
    field :weight, :float, default: 1.0
    field :resize_mode, :string, default: "Scale to Fit (Inner Fit)"
    field :low_vram, :boolean, default: false
    field :processor_res, :integer, default: 64
    field :threshold_a, :float, default: 64.0
    field :threshold_b, :float, default: 64.0
    field :guidance_start, :float, default: 0.0
    field :guidance_end, :float, default: 1.0
    field :pixel_perfect, :boolean, default: true
    field :control_mode, :string, default: "Balanced"
    field :advanced_weighting, {:array, :float}, default: nil
  end

  def changeset(%__MODULE__{} = control_net, attrs) do
    control_net
    |> cast(
      attrs,
      [
        :enabled,
        :image,
        :mask,
        :mask_image,
        :effective_region_mask,
        :model,
        :module,
        :weight,
        :resize_mode,
        :low_vram,
        :processor_res,
        :threshold_a,
        :threshold_b,
        :guidance_start,
        :guidance_end,
        :pixel_perfect,
        :control_mode,
        :advanced_weighting
      ]
    )
  end
end
