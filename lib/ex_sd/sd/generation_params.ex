defmodule ExSd.Sd.GenerationParams do
  use Ecto.Schema
  import Ecto.Changeset
  alias ExSd.Sd.AlwaysOnScripts

  @type t :: %__MODULE__{
          alwayson_scripts: AlwaysonScripts.t()
        }
  @derive {Jason.Encoder, except: []}
  @primary_key false
  embedded_schema do
    field :txt2img, :boolean, default: false
    field(:denoising_strength, :float, default: 1.0)
    field(:sp_denoising_strength, :float, default: 0.5)
    # field :# firstphase_width: 0,
    # field :# firstphase_height: 0,
    field :enable_hr, :boolean, default: false
    field :hr_scale, :float, default: 2.0
    field :hr_upscaler, :string, default: nil
    # field :hr_second_pass_steps, :float, default: 0
    # field :# hr_resize_x: 0.0,
    # field :# hr_resize_y: 0.0,
    field(:prompt, :string, default: "")
    # field :# styles: nil
    field(:seed, :integer, default: -1)
    field(:subseed, :integer, default: -1)
    field(:subseed_strength, :float, default: 0.0)
    field(:seed_resize_from_h, :integer, default: 0)
    field(:seed_resize_from_w, :integer, default: 0)
    field(:sampler_name, :string, default: "")
    field(:batch_size, :integer, default: 1)
    field(:n_iter, :integer, default: 1)
    field(:steps, :integer, default: 20)
    field(:cfg_scale, :float, default: 7.0)
    field(:image_cfg_scale, :float, default: 1.5)
    field(:width, :integer, default: 512)
    field(:height, :integer, default: 512)
    field(:restore_faces, :boolean, default: false)
    field(:tiling, :boolean, default: false)
    field(:negative_prompt, :string, default: "")
    # field(:eta, :float, default: 0.0)
    # field(:s_churn, :float, default: 0.0)
    # field(:s_tmax, :float, default: 0.0)
    # field(:s_tmin, :float, default: 0.0)
    # field(:s_noise, :float, default: 1.0)
    field(:override_settings, :map, default: %{})
    field(:override_settings_restore_afterwards, :boolean, default: true)
    field(:mask, :string, default: "")
    field(:init_images, {:array, :string}, default: [])
    field(:include_init_images, :boolean, default: true)
    field(:resize_mode, :integer, default: 0)
    field(:inpaint_full_res, :boolean, default: false)
    field(:inpainting_fill, :integer, default: 1)
    field(:inpaint_full_res_padding, :integer, default: 0)
    embeds_one(:alwayson_scripts, AlwaysOnScripts)
  end

  def changeset(%__MODULE__{} = generation_params, attrs) do
    generation_params
    |> cast(attrs, [
      :enable_hr,
      :txt2img,
      :denoising_strength,
      :sp_denoising_strength,
      # :firstphase_width,
      # :firstphase_height,
      :hr_scale,
      :hr_upscaler,
      # :hr_second_pass_steps,
      # :hr_resize_x,
      # :hr_resize_y,
      :prompt,
      # :styles,
      :seed,
      :seed,
      :subseed,
      :subseed_strength,
      :seed_resize_from_h,
      :seed_resize_from_w,
      :sampler_name,
      :batch_size,
      :n_iter,
      :steps,
      :cfg_scale,
      :image_cfg_scale,
      :width,
      :height,
      :restore_faces,
      :tiling,
      :negative_prompt,
      # :eta,
      # :s_churn,
      # :s_tmax,
      # :s_tmin,
      # :s_noise,
      :override_settings,
      :override_settings_restore_afterwards,
      :mask,
      :inpainting_fill,
      :inpaint_full_res_padding,
      :init_images,
      :inpaint_full_res
    ])
    |> cast_embed(:alwayson_scripts, required: false)
  end
end
