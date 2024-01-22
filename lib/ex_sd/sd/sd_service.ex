defmodule ExSd.Sd.SdService do
  require Logger

  alias ExSd.ComfyGenerationServer
  alias ExSd.ComfyClient
  alias ExSd.Sd.ControlNetArgs
  alias ExSd.Sd.GenerationParams
  alias ExSd.AutoClient
  alias ExSd.Sd.ImageService

  @type backend :: :auto | :comfy

  def generate_image(
        %GenerationParams{
          width: width,
          height: height,
          txt2img: txt2img
        } = generation_params,
        %{"invert_mask" => invert_mask} = attrs,
        backend: :comfy
      ) do
    original_dimensions = %{width: width, height: height}
    # mask = fill_mask(generation_params.mask)

    # create mask
    {:ok, mask_binary, mask_image} =
      if txt2img do
        new_mask_image =
          Image.new!(original_dimensions.width, original_dimensions.height)
          |> Image.Draw.flood!(0, 0, color: :white)

        new_mask_binary =
          new_mask_image
          |> Image.write!(:memory, suffix: ".png")
          |> Base.encode64()

        {:ok, new_mask_binary, new_mask_image}
      else
        ImageService.mask_from_alpha(
          List.first(generation_params.init_images),
          generation_params.mask,
          invert_mask
        )
      end

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
      |> generate_seed()

    {generation_params, positive_loras, negative_loras} = generation_params |> extract_loras()

    mask_image_average = Image.average!(mask_image) |> Enum.sum() |> div(3)

    attrs =
      Map.merge(attrs, %{
        "positive_loras" => positive_loras,
        "negative_loras" => negative_loras
      })

    flow = [
      %{
        generation_params: generation_params,
        attrs: attrs,
        original_dimensions: original_dimensions,
        mask_image: mask_image,
        mask_image_average: mask_image_average,
        client: ComfyClient
      }
    ]

    ComfyGenerationServer.start_flow(flow, attrs, original_dimensions)
  end

  def generate_image(
        %GenerationParams{
          width: width,
          height: height,
          txt2img: txt2img
        } = generation_params,
        %{"scale" => scale, "invert_mask" => invert_mask} = attrs,
        backend: :auto
      ) do
    full_scale_pass = Map.get(attrs, "full_scale_pass", false)
    original_dimensions = %{width: width, height: height}
    # mask = fill_mask(generation_params.mask)

    # create mask
    {:ok, mask_binary, mask_image} =
      if txt2img do
        new_mask_image =
          Image.new!(original_dimensions.width, original_dimensions.height)
          |> Image.Draw.flood!(0, 0, color: :white)

        new_mask_binary =
          new_mask_image
          |> Image.write!(:memory, suffix: ".png")
          |> Base.encode64()

        {:ok, new_mask_binary, new_mask_image}
      else
        ImageService.mask_from_alpha(
          List.first(generation_params.init_images),
          generation_params.mask,
          invert_mask
        )
      end

    Logger.info("Start generation")

    has_second_pass = full_scale_pass and scale < 1

    generation_params =
      generation_params
      # FIXME: images not saved (try to save in a task?)
      |> save_init_mask_and_init_image()
      |> Map.put(:mask, mask_binary)
      |> scale_generation_dimensions(attrs)
      |> remove_invalid_alwayson_scripts()
      |> maybe_set_controlnet_images()
      |> maybe_save_controlnet_images()
      |> tap(&Logger.debug(&1))

    mask_image_average = Image.average!(mask_image) |> Enum.sum() |> div(3)

    result =
      generate_and_receive(
        generation_params,
        attrs,
        original_dimensions,
        mask_image,
        mask_image_average
      )

    # TODO: handle tiled diffusion on second pass only if active
    if has_second_pass do
      case result do
        {:error, _} ->
          result

        {seed, result_images_base64, _, _} ->
          init_image = get_second_pass_init_image(generation_params, result_images_base64)

          generate_and_receive(
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
    else
      result
    end
  end

  def generate_and_receive(
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

    case AutoClient.generate_image(generation_params) do
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
        Logger.error("Client task error! Second Pass:#{inspect(second_pass)}")
        Logger.error(err)
        error
    end
  end

  def handle_generation_completion(result, :comfy = _backend) do
    %{image: images_base64, attrs: attrs, dimensions: dimensions, flow: flow} = result

    mask_image = ImageService.image_from_dataurl(flow.generation_params.mask)

    mask_image_average =
      mask_image
      |> Image.average!()
      |> Enum.sum()
      |> div(3)

    result_image =
      if mask_image_average === 255 and
           attrs["use_scaled_dimensions"] == true do
        Logger.info("Returning raw image for overriding scale")

        images_base64
        |> ImageService.image_from_dataurl()
        |> Image.write!(:memory, suffix: ".png")
        |> Base.encode64()
      else
        result_image =
          images_base64
          |> ImageService.image_from_dataurl()
          |> Image.thumbnail!(
            dimensions.width,
            resize: :force,
            height: dimensions.height
          )

        {:ok, result_image} =
          result_image
          |> Image.compose(mask_image, blend_mode: :dest_in)

        result_image
        |> Image.write!(:memory, suffix: ".png")
        |> Base.encode64()
      end

    result_image
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
        else: %ExSd.Sd.AlwaysOnScripts{}
      )
      |> Map.from_struct()
      |> Enum.filter(fn {_k, v} -> !is_nil(v) end)
      |> Enum.into(%{})
    )
  end

  defp generate_seed(%GenerationParams{seed: seed} = generation_params) do
    generation_params
    |> Map.put(
      :seed,
      if(
        seed == -1,
        do: :rand.uniform(1_000_000_000_000_000),
        else: seed
      )
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

  @spec interrupt(backend()) :: {:ok, any}
  def interrupt(:auto), do: AutoClient.interrupt()
  def interrupt(:comfy), do: ComfyClient.interrupt()

  @spec free_memory(backend()) :: {:ok, any}
  def free_memory(:comfy), do: ComfyClient.free_memory()

  defdelegate controlnet_detect(params), to: AutoClient

  @spec get_samplers(backend()) :: {:error, any} | {:ok, list}
  def get_samplers(:auto), do: AutoClient.get_samplers()
  def get_samplers(:comfy), do: ComfyClient.get_samplers()

  @spec get_controlnet_models(backend()) :: {:error, any} | {:ok, any}
  def get_controlnet_models(:auto), do: AutoClient.get_controlnet_models()
  def get_controlnet_models(:comfy), do: ComfyClient.get_controlnet_models()

  @spec get_controlnet_preprocessors(:auto) :: {:error, any} | {:ok, list(binary), any}
  def get_controlnet_preprocessors(:auto), do: AutoClient.get_controlnet_preprocessors()
  @spec get_controlnet_preprocessors(:comfy) :: {:error, any} | {:ok, list(binary)}
  def get_controlnet_preprocessors(:comfy), do: ComfyClient.get_controlnet_preprocessors()

  @spec get_models(backend()) :: {:error, any} | {:ok, any}
  def get_models(:auto), do: AutoClient.get_models()
  def get_models(:comfy), do: ComfyClient.get_models()

  @spec get_vaes(backend()) :: {:error, any} | {:ok, any}
  def get_vaes(:auto), do: AutoClient.get_vaes()
  def get_vaes(:comfy), do: ComfyClient.get_vaes()

  @spec get_schedulers(backend()) :: {:error, any} | {:ok, any}
  def get_schedulers(:comfy), do: ComfyClient.get_schedulers()

  @spec refresh_models() :: {:error, any} | {:ok, any}
  defdelegate refresh_models(), to: AutoClient

  @spec get_upscalers(backend()) :: {:error, any} | {:ok, any}
  def get_upscalers(:auto), do: AutoClient.get_upscalers()
  def get_upscalers(:comfy), do: ComfyClient.get_upscalers()

  @spec get_loras(backend()) :: {:error, any} | {:ok, any}
  def get_loras(:auto), do: AutoClient.get_loras()
  def get_loras(:comfy), do: ComfyClient.get_loras()

  @spec get_embeddings(backend()) :: {:error, any} | {:ok, any}
  def get_embeddings(:auto) do
    case AutoClient.get_embeddings() do
      {:ok, embeddings} ->
        {:ok,
         embeddings["loaded"]
         |> Enum.map(fn {k, _v} -> k end)
         |> Enum.sort_by(&String.downcase/1, &<=/2)}

      result ->
        result
    end
  end

  def get_embeddings(:comfy) do
    case ComfyClient.get_embeddings() do
      {:ok, embeddings} ->
        {:ok,
         embeddings
         |> Enum.sort_by(&String.downcase/1, &<=/2)}

      result ->
        result
    end
  end

  @spec get_options() :: {:error, any} | {:ok, any}
  defdelegate get_options(), to: AutoClient

  @spec get_png_info(any) :: {:error, any} | {:ok, any}
  defdelegate get_png_info(png_data_url), to: AutoClient

  @spec get_scripts() :: {:error, any} | {:ok, any}
  defdelegate get_scripts(), to: AutoClient

  @spec get_progress(backend()) :: {:error, any} | {:ok, any}
  def get_progress(:auto), do: AutoClient.get_progress()
  # def get_progress(:comfy), do: ComfyClient.get_progress()

  @spec get_memory_usage(backend()) :: {:error, any} | {:ok, any}
  def get_memory_usage(:comfy), do: ComfyClient.get_memory_usage()
  def get_memory_usage(:auto), do: AutoClient.get_memory_usage()

  @spec post_active_model(binary()) :: {:error, any} | {:ok, any}
  defdelegate post_active_model(model_title), to: AutoClient

  @spec post_active_vae(binary()) :: {:error, any} | {:ok, any}
  defdelegate post_active_vae(vae), to: AutoClient

  def round_to_closest_multiple_of_8_down(number) do
    round((number - 4) / 8) * 8
  end

  @spec extract_loras(ExSd.Sd.GenerationParams.t()) :: {ExSd.Sd.GenerationParams.t(), list, list}
  def extract_loras(
        %GenerationParams{prompt: prompt, negative_prompt: negative_prompt} = generation_params
      ) do
    lora_regex = ~r/<lora:(?<name>\S+):(?<value>\S+)>/

    positive_loras =
      Regex.scan(lora_regex, prompt, capture: :all_names)
      |> Enum.map(fn [name, value] ->
        %{name: name, value: Float.parse(value) |> elem(0)}
      end)

    negative_loras =
      Regex.scan(lora_regex, negative_prompt, capture: :all_names)
      |> Enum.map(fn [name, value] ->
        %{name: name, value: Float.parse(value) |> elem(0)}
      end)

    cleaned_prompt = Regex.replace(lora_regex, prompt, "")
    cleaned_negative_prompt = Regex.replace(lora_regex, negative_prompt, "")

    {%{generation_params | prompt: cleaned_prompt, negative_prompt: cleaned_negative_prompt},
     positive_loras, negative_loras}
  end
end
