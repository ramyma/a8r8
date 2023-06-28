defmodule ExSd.Sd.SdService do
  require Logger

  alias ExSd.Sd.ControlNetArgs
  alias ExSd.Sd.GenerationParams
  alias ExSd.AutoClient
  alias ExSd.Sd.ImageService

  def generate_image(
        client,
        %GenerationParams{
          width: width,
          height: height,
          txt2img: txt2img
        } = generation_params,
        %{"scale" => scale, "invert_mask" => invert_mask} = attrs
      ) do
    full_scale_pass = Map.get(attrs, "full_scale_pass", false)
    original_dimensions = %{width: width, height: height}
    # mask = fill_mask(generation_params.mask)

    # create mask
    {mask_binary, mask_image} =
      ImageService.mask_from_alpha(
        List.first(generation_params.init_images),
        generation_params.mask,
        invert_mask
      )

    Logger.info("Start generation")

    generation_params =
      generation_params
      # FIXME: images not saved (try to save in a task?)
      |> save_init_mask_and_init_image()
      |> Map.put(:mask, mask_binary)
      |> scale_generation_dimensions(attrs)
      |> remove_invalid_alwayson_scripts()
      |> maybe_set_controlnet_images()
      |> maybe_save_controlnet_images()

    mask_image_average = Image.average!(mask_image) |> Enum.sum() |> div(3)

    result =
      generate_and_receive(
        client,
        generation_params,
        attrs,
        original_dimensions,
        mask_image,
        mask_image_average
      )

    # TODO: handle tiled diffusion on second pass only if active
    if (txt2img and scale >= 1) or !full_scale_pass or scale >= 1 do
      result
    else
      case result do
        {:error, _} ->
          result

        {seed, result_images_base64, _, _} ->
          init_image = get_second_pass_init_image(generation_params, result_images_base64)

          generate_and_receive(
            client,
            generation_params
            |> Map.merge(%{
              init_images: [init_image],
              width: width,
              height: height,
              seed: seed,
              inpainting_fill: 1,
              txt2img: false
            }),
            attrs,
            original_dimensions,
            mask_image,
            mask_image_average,
            true
          )
      end
    end
  end

  def generate_and_receive(
        client,
        %GenerationParams{} = generation_params,
        attrs,
        %{width: width, height: height},
        mask_image,
        mask_image_average,
        second_pass \\ false
      ) do
    position = attrs["position"]

    Logger.info("Second Pass: #{inspect(second_pass)}")
    generation_params = put_denoising_strength(generation_params, attrs, second_pass)

    case AutoClient.generate_image(
           client,
           generation_params
         ) do
      %{images: images, seed: seed} ->
        images_base64 = images

        # TODO: handle batch generation
        change =
          if mask_image_average === 255 and
               attrs["use_scaled_dimensions"] == true do
            Logger.info("Returning raw image for overriding scale")

            images_base64
            |> List.first()
            |> ImageService.image_from_dataurl()
            |> Image.write!(:memory, suffix: ".png")
            |> Base.encode64()
          else
            change =
              images_base64
              |> List.first()
              |> ImageService.image_from_dataurl()
              |> Image.thumbnail!(
                width,
                resize: :force,
                height: height
              )

            {:ok, change} =
              change
              |> Image.compose(mask_image, blend_mode: :dest_in)

            change
            |> Image.write!(:memory, suffix: ".png")
            |> Base.encode64()
          end

        {seed, images_base64 |> List.replace_at(0, change), position,
         %{width: width, height: height}}

      {:error, err} = error ->
        Logger.error("Tesla task error! Second Pass:#{inspect(second_pass)}")
        Logger.error(err)
        error
    end
  end

  defp put_denoising_strength(
         %GenerationParams{txt2img: true, sp_denoising_strength: sp_denoising_strength} =
           generation_params,
         _attrs,
         _second_pass
       ) do
    generation_params |> Map.put(:denoising_strength, sp_denoising_strength)
  end

  defp put_denoising_strength(
         %GenerationParams{txt2img: false, sp_denoising_strength: sp_denoising_strength} =
           generation_params,
         %{"scale" => scale} = _attrs,
         true = _second_pass
       )
       when scale < 1 do
    generation_params
    |> Map.put(:denoising_strength, sp_denoising_strength)
  end

  defp put_denoising_strength(
         %GenerationParams{txt2img: false} = generation_params,
         _attrs,
         _second_pass
       ) do
    generation_params
  end

  defp save_init_mask_and_init_image(%GenerationParams{} = generation_params) do
    Task.Supervisor.async_nolink(ExSd.TaskSupervisor, fn ->
      if generation_params.mask, do: ImageService.save(generation_params.mask, "input_mask")
      ImageService.save(List.first(generation_params.init_images), "init_image")
    end)

    generation_params
  end

  defp scale_generation_dimensions(
         %{txt2img: true} = generation_params,
         %{"scale" => scale} = _attrs
       )
       when scale >= 1 do
    generation_params
    |> Map.merge(%{
      alwayson_scripts: generation_params.alwayson_scripts || %{}
    })
  end

  defp scale_generation_dimensions(
         %{width: width, height: height} = generation_params,
         %{"scale" => scale} = _attrs
       ) do
    generation_params
    |> Map.merge(%{
      width: if(scale === 1, do: width, else: round_to_closest_multiple_of_8_down(width * scale)),
      height:
        if(scale === 1, do: height, else: round_to_closest_multiple_of_8_down(height * scale)),
      alwayson_scripts: generation_params.alwayson_scripts || %{}
    })
  end

  defp has_controlnet?(generation_params) do
    Map.has_key?(generation_params, :alwayson_scripts) and
      Map.has_key?(generation_params.alwayson_scripts, :controlnet) and
      !is_nil(generation_params.alwayson_scripts) and
      !is_nil(generation_params.alwayson_scripts.controlnet)
  end

  defp maybe_set_controlnet_images(
         %GenerationParams{txt2img: true, init_images: init_images, mask: mask} =
           generation_params
       ) do
    new_generation_params =
      if has_controlnet?(generation_params) do
        new_args =
          generation_params.alwayson_scripts.controlnet.args
          |> Enum.map(fn
            %ControlNetArgs{input_image: input_image} = controlnet_layer
            when is_nil(input_image) or input_image == "" ->
              controlnet_layer
              |> Map.put(:input_image, List.first(init_images))
              |> Map.put(:mask, mask)

            %ControlNetArgs{} = controlnet_layer ->
              controlnet_layer
              |> Map.put(:mask, mask)
          end)

        Map.merge(generation_params, %{
          init_images: [],
          alwayson_scripts: %{
            controlnet: %{args: new_args}
          }
        })
      else
        generation_params
      end

    new_generation_params
  end

  defp maybe_set_controlnet_images(%GenerationParams{txt2img: false} = generation_params),
    do: generation_params

  defp maybe_save_controlnet_images(generation_params) do
    if(
      has_controlnet?(generation_params),
      do:
        generation_params.alwayson_scripts.controlnet.args
        |> Enum.with_index(1)
        |> Enum.each(fn {item, index} ->
          ImageService.save(
            item.input_image,
            "controlnet_image#{index}"
          )
        end)
    )

    generation_params
  end

  defp remove_invalid_alwayson_scripts(generation_params) do
    generation_params
    |> Map.replace(
      :alwayson_scripts,
      if(generation_params.alwayson_scripts != %{},
        do: generation_params.alwayson_scripts,
        else: %ExSd.Sd.AlwaysOnScript{}
      )
      |> Map.from_struct()
      |> Enum.filter(fn {_k, v} -> !is_nil(v) end)
      |> Enum.into(%{})
    )
  end

  defp get_second_pass_init_image(
         %GenerationParams{txt2img: txt2img, init_images: init_images} = _generation_params,
         result_images_base64
       ) do
    if(txt2img,
      do: List.first(result_images_base64),
      else:
        Image.compose!(
          List.first(init_images) |> ImageService.image_from_dataurl(),
          List.first(result_images_base64) |> ImageService.image_from_dataurl()
        )
        |> Image.write!(:memory, suffix: ".png")
        |> Base.encode64()
    )
  end

  @spec interrupt(binary | Tesla.Client.t()) :: {:ok, Tesla.Env.t()}
  defdelegate interrupt(client), to: AutoClient

  defdelegate controlnet_detect(client, params), to: AutoClient

  @spec get_samplers(binary | Tesla.Client.t()) :: {:error, any} | {:ok, list}
  defdelegate get_samplers(client), to: AutoClient

  @spec get_controlnet_models(binary | Tesla.Client.t()) :: {:error, any} | {:ok, any}
  defdelegate get_controlnet_models(client), to: AutoClient

  @spec get_controlnet_modules(binary | Tesla.Client.t()) ::
          {:error, any} | {:ok, list(binary), map}
  defdelegate get_controlnet_modules(client), to: AutoClient

  @spec get_models(binary | Tesla.Client.t()) :: {:error, any} | {:ok, any}
  defdelegate get_models(client), to: AutoClient

  @spec refresh_models(binary | Tesla.Client.t()) :: {:error, any} | {:ok, any}
  defdelegate refresh_models(client), to: AutoClient

  @spec get_upscalers(binary | Tesla.Client.t()) :: {:error, any} | {:ok, any}
  defdelegate get_upscalers(client), to: AutoClient

  @spec get_loras(binary | Tesla.Client.t()) :: {:error, any} | {:ok, any}
  defdelegate get_loras(client), to: AutoClient

  @spec get_embeddings(binary | Tesla.Client.t()) :: {:error, any} | {:ok, any}
  defdelegate get_embeddings(client), to: AutoClient

  @spec get_options(binary | Tesla.Client.t()) :: {:error, any} | {:ok, any}
  defdelegate get_options(client), to: AutoClient

  @spec get_png_info(binary | Tesla.Client.t(), any) :: {:error, any} | {:ok, any}
  defdelegate get_png_info(client, png_data_url), to: AutoClient

  @spec get_scripts(binary | Tesla.Client.t()) :: {:error, any} | {:ok, any}
  defdelegate get_scripts(client), to: AutoClient

  @spec get_progress(binary | Tesla.Client.t()) :: {:error, any} | {:ok, any}
  defdelegate get_progress(client), to: AutoClient

  @spec get_memory_usage(binary | Tesla.Client.t()) :: {:error, any} | {:ok, any}
  defdelegate get_memory_usage(client), to: AutoClient

  @spec post_active_model(binary | Tesla.Client.t(), any) :: {:error, any} | {:ok, any}
  defdelegate post_active_model(client, model_title), to: AutoClient

  def round_to_closest_multiple_of_8_down(number) do
    round((number - 4) / 8) * 8
  end
end
