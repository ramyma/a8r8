defmodule ExSd.Sd.ComfyPrompt do
  require Logger
  alias ExSd.Sd.ControlNetArgs
  alias ExSd.Sd.GenerationParams

  @type ref_node_value :: [node_name: binary(), output_id: non_neg_integer()]
  @type comfy_node :: %{binary() => %{class_type: binary(), inputs: node_inputs()}}
  @type node_value :: number() | binary() | ref_node_value()
  @type node_inputs :: %{(atom() | binary()) => node_value}
  @type prompt :: %{prompt: comfy_node()}

  @spec new(comfy_node()) :: prompt()
  def new(initial_nodes \\ %{}) do
    %{prompt: initial_nodes}
  end

  @spec node(binary(), binary(), node_inputs()) :: comfy_node()
  def node(name, class_type, inputs \\ %{}) do
    %{}
    |> Map.put(name, %{
      class_type: class_type,
      inputs: inputs
    })
  end

  @spec node_ref(binary(), non_neg_integer()) :: ref_node_value()
  def node_ref(node, output_id) do
    [node, output_id]
  end

  @spec txt2img(GenerationParams.t(), map()) :: prompt()
  def txt2img(%GenerationParams{} = generation_params, attrs) do
    controlnet_args =
      generation_params
      |> get_in([Access.key(:alwayson_scripts), Access.key(:controlnet), Access.key(:args)])

    positive_loras = Map.get(attrs, "positive_loras")
    # negative_loras = Map.get(attrs, "negative_loras")

    full_scale_pass = Map.get(attrs, "full_scale_pass", false)

    is_regional_prompting_enabled = Map.get(attrs, "is_regional_prompting_enabled", false)

    ip_adapters = Map.get(attrs, "ip_adapters", [])

    # regional_prompts = Map.get(attrs, "regional_prompts")

    prompt =
      new()
      |> add_vae_loader(attrs["vae"])
      |> add_model_loader(attrs["model"], clip_skip: Map.get(attrs, "clip_skip", 1))
      |> add_clip_text_encode(
        if(Enum.empty?(positive_loras),
          do: node_ref("clip", 0),
          else: node_ref("positive_lora#{length(positive_loras) - 1}", 1)
        ),
        generation_params.prompt,
        "positive_prompt"
      )
      |> add_clip_text_encode(
        if(Enum.empty?(positive_loras),
          do: node_ref("clip", 0),
          else: node_ref("positive_lora#{length(positive_loras) - 1}", 1)
        ),
        generation_params.negative_prompt,
        "negative_prompt"
      )
      |> maybe_add_regional_prompts_with_coupling(attrs,
        width: generation_params.width,
        height: generation_params.height,
        is_txt2img: generation_params.txt2img
      )
      |> add_empty_latent_image(
        batch_size: generation_params.batch_size,
        width: generation_params.width,
        height: generation_params.height
      )
      |> add_k_sampler(
        "sampler",
        cfg: generation_params.cfg_scale,
        denoise: 1,
        latent_image: node_ref("empty_latent_image", 0),
        model:
          if(Enum.empty?(positive_loras),
            do:
              if(is_regional_prompting_enabled,
                do: node_ref("attention_couple", 0),
                else:
                  if(Enum.empty?(ip_adapters),
                    do: get_base_model(generation_params.txt2img),
                    else: node_ref("ip_adapter_#{length(ip_adapters) - 1}", 0)
                  )
              ),
            else:
              if(is_regional_prompting_enabled,
                do: node_ref("attention_couple", 0),
                else:
                  if(Enum.empty?(ip_adapters),
                    do: node_ref("positive_lora#{length(positive_loras) - 1}", 0),
                    else: node_ref("ip_adapter_#{length(ip_adapters) - 1}", 0)
                  )
              )
          ),
        positive:
          if(is_nil(controlnet_args) or Enum.empty?(controlnet_args),
            do:
              node_ref(
                get_positive_prompt(attrs),
                0
              ),
            else:
              node_ref(
                "cn#{length(controlnet_args) - 1}_apply_controlnet",
                0
              )
          ),
        negative:
          if(is_nil(controlnet_args) or Enum.empty?(controlnet_args),
            do:
              node_ref(
                "negative_prompt",
                0
              ),
            else:
              node_ref(
                "cn#{length(controlnet_args) - 1}_apply_controlnet",
                1
              )
          ),
        sampler_name: generation_params.sampler_name,
        scheduler: attrs["scheduler"] || "karras",
        seed: generation_params.seed,
        steps: generation_params.steps
      )
      |> add_vae_decode(
        node_ref(
          if(
            Map.get(attrs, "scale") > 1 or
              (Map.get(attrs, "scale") < 1 and full_scale_pass),
            do: "hires_sampler",
            else: "sampler"
          ),
          0
        ),
        get_vae(attrs)
      )
      |> add_loras(attrs, is_txt2img: generation_params.txt2img)
      |> add_output(node_ref("vae_decode", 0))
      |> maybe_add_controlnet(
        controlnet_args,
        generation_params,
        attrs,
        !is_nil(controlnet_args),
        positive:
          node_ref(
            get_positive_prompt(attrs),
            0
          ),
        negative:
          node_ref(
            "negative_prompt",
            0
          )
      )
      |> maybe_add_ip_adapters(attrs, model: node_ref("model", 0))
      |> maybe_add_scale(generation_params, generation_params.hr_scale != 1,
        attrs: attrs,
        positive_loras: positive_loras,
        controlnet_args: controlnet_args
      )

    # File.write!("./prompt.json", Jason.encode!(prompt, pretty: true))
    prompt
  end

  @spec img2img(GenerationParams.t(), map()) :: prompt()
  def img2img(%GenerationParams{} = generation_params, attrs) do
    full_scale_pass = Map.get(attrs, "full_scale_pass", false)
    has_full_scale_pass = full_scale_pass and attrs["scale"] < 1

    positive_loras = Map.get(attrs, "positive_loras")
    # negative_loras = Map.get(attrs, "negative_loras")

    controlnet_args =
      generation_params
      |> get_in([Access.key(:alwayson_scripts), Access.key(:controlnet), Access.key(:args)])

    has_ultimate_upscale = Map.get(attrs, "ultimate_upscale", false)

    # is_sd_xl = attrs["model"] |> String.downcase() |> String.contains?("xl")

    is_regional_prompting_enabled = Map.get(attrs, "is_regional_prompting_enabled", false)

    positive_prompt_node_name = get_positive_prompt(attrs)

    ip_adapters = Map.get(attrs, "ip_adapters", [])
    fooocus_inpaint = Map.get(attrs, "fooocus_inpaint", false)

    prompt =
      new()
      |> add_model_loader(attrs["model"], clip_skip: Map.get(attrs, "clip_skip", 1))
      |> add_node(
        node("differential_diffusion", "DifferentialDiffusion", %{
          model: node_ref("model", 0)
        })
      )
      |> add_clip_text_encode(
        if(Enum.empty?(positive_loras),
          do: node_ref("clip", 0),
          else: node_ref("positive_lora#{length(positive_loras) - 1}", 1)
        ),
        generation_params.prompt,
        "positive_prompt"
      )
      |> add_clip_text_encode(
        if(Enum.empty?(positive_loras),
          do: node_ref("clip", 0),
          else: node_ref("positive_lora#{length(positive_loras) - 1}", 1)
        ),
        generation_params.prompt,
        "negative_prompt"
      )
      |> add_loras(attrs, is_txt2img: generation_params.txt2img)
      |> add_vae_loader(attrs["vae"])
      |> add_image_loader(
        name: "image_input",
        base64_image:
          String.replace(
            List.first(generation_params.init_images),
            ~r/data:image\S+;base64,/i,
            ""
          )
      )
      |> add_image_scale(generation_params, "scaler",
        image:
          node_ref(
            if(generation_params.hr_upscaler == "None" or generation_params.hr_scale < 1,
              do: "image_input",
              else: "upscale_with_model"
            ),
            0
          ),
        width: generation_params.width,
        height: generation_params.height
      )
      |> add_image_upscale_with_model("upscale_with_model",
        upscale_model:
          node_ref(
            "upscaler",
            0
          ),
        image:
          node_ref(
            "image_input",
            0
          )
      )
      |> add_img2img_vae_encode(
        pixels:
          node_ref(
            if(
              has_ultimate_upscale or
                attrs["scale"] == 1 or
                generation_params.hr_upscaler == "Latent",
              do: "image_input",
              else: "scaler"
            ),
            0
          ),
        vae: get_vae(attrs),
        name: "img2img_vae_encode",
        batch_size: generation_params.batch_size,
        positive:
          node_ref(
            get_positive_prompt(attrs),
            0
          ),
        negative:
          node_ref(
            "negative_prompt",
            0
          ),
        mask:
          node_ref(
            "image_to_mask",
            0
          )
      )
      |> add_upscale_model_loader(generation_params.hr_upscaler, "upscaler")
      |> add_image_loader(
        name: "mask_base64",
        base64_image:
          String.replace(
            generation_params.mask,
            ~r/data:image\S+;base64,/i,
            ""
          )
      )
      |> add_node(
        node("image_to_mask", "ImageToMask", %{
          channel: "red",
          image:
            node_ref(
              "mask_base64",
              0
            )
        })
      )
      |> add_node(
        node("inpaint_model_conditioning", "InpaintModelConditioning", %{
          positive:
            if(is_nil(controlnet_args) or Enum.empty?(controlnet_args),
              do:
                if(inpaint_model?(attrs),
                  do:
                    node_ref(
                      "second_pass_inpaint_model_conditioning",
                      0
                    ),
                  else:
                    node_ref(
                      positive_prompt_node_name,
                      0
                    )
                ),
              else: [
                "cn#{length(controlnet_args) - 1}_apply_controlnet",
                0
              ]
            ),
          negative:
            if(is_nil(controlnet_args) or Enum.empty?(controlnet_args),
              do:
                if(inpaint_model?(attrs),
                  do:
                    node_ref(
                      "inpaint_model_conditioning",
                      1
                    ),
                  else:
                    node_ref(
                      "negative_prompt",
                      0
                    )
                ),
              else: [
                "cn#{length(controlnet_args) - 1}_apply_controlnet",
                1
              ]
            ),
          vae: get_vae(attrs),
          pixels:
            node_ref(
              if(
                has_ultimate_upscale or
                  attrs["scale"] == 1 or
                  generation_params.hr_upscaler == "Latent",
                do: "image_input",
                else: "scaler"
              ),
              0
            ),
          mask:
            node_ref(
              "image_to_mask",
              0
            )
        })
      )
      |> add_node(
        node("inpaint_latent_batch", "RepeatLatentBatch", %{
          amount: generation_params.batch_size,
          samples: node_ref("img2img_vae_encode_node", 3)
        })
      )
      # |> add_node(
      #   node("latent_noise_mask", "SetLatentNoiseMask", %{
      #     samples:
      #       node_ref(
      #         "img2img_vae_encode",
      #         0
      #       ),
      #     mask:
      #       node_ref(
      #         "image_to_mask",
      #         0
      #       )
      #   })
      # )
      |> add_node(
        node("load_fooocus_inpaint_patch", "INPAINT_LoadFooocusInpaint", %{
          head: "fooocus_inpaint_head.pth",
          patch: "inpaint_v26.fooocus.patch"
        }),
        fooocus_inpaint
      )
      |> add_node(
        node("apply_fooocus_inpaint", "INPAINT_ApplyFooocusInpaint", %{
          model: get_base_model(generation_params.txt2img),
          patch: node_ref("load_fooocus_inpaint_patch", 0),
          latent:
            node_ref(
              "img2img_vae_encode_node",
              2
            )
        }),
        fooocus_inpaint
      )
      |> add_latent_scale(generation_params, "latent_upscaler",
        samples:
          if(inpaint_model?(attrs),
            do:
              node_ref(
                "inpaint_latent_batch",
                0
              ),
            else:
              node_ref(
                "latent_noise_mask",
                0
              )
          )
      )
      |> maybe_add_regional_prompts_with_coupling(attrs,
        base_prompt: node_ref("img2img_vae_encode_node", 0),
        width: generation_params.width,
        height: generation_params.height,
        is_txt2img: generation_params.txt2img
      )
      |> add_k_sampler("sampler",
        cfg: generation_params.cfg_scale,
        denoise: generation_params.denoising_strength,
        latent_image:
          if(
            not has_ultimate_upscale and generation_params.hr_upscaler == "Latent" and
              attrs["scale"] != 1,
            do: ["latent_upscaler", 0],
            else:
              if(inpaint_model?(attrs),
                do: [
                  "inpaint_latent_batch",
                  0
                ],
                else:
                  node_ref(
                    "inpaint_latent_batch",
                    0
                  )
              )
          ),
        model:
          if(Enum.empty?(positive_loras),
            do:
              if(is_regional_prompting_enabled,
                do: node_ref("attention_couple", 0),
                else:
                  if(Enum.empty?(ip_adapters),
                    do:
                      if(not generation_params.txt2img and fooocus_inpaint,
                        do: node_ref("apply_fooocus_inpaint", 0),
                        else: get_base_model(generation_params.txt2img)
                      ),
                    else: node_ref("ip_adapter_#{length(ip_adapters) - 1}", 0)
                  )
              ),
            else:
              if(is_regional_prompting_enabled,
                do: node_ref("attention_couple", 0),
                else:
                  if(Enum.empty?(ip_adapters),
                    do: node_ref("positive_lora#{length(positive_loras) - 1}", 0),
                    else: node_ref("ip_adapter_#{length(ip_adapters) - 1}", 0)
                  )
              )
          ),
        positive:
          if(is_nil(controlnet_args) or Enum.empty?(controlnet_args),
            do: node_ref("img2img_vae_encode_node", 0),
            else: node_ref("cn#{length(controlnet_args) - 1}_apply_controlnet", 0)
          ),
        negative:
          if(is_nil(controlnet_args) or Enum.empty?(controlnet_args),
            do: node_ref("img2img_vae_encode_node", 1),
            else: node_ref("cn#{length(controlnet_args) - 1}_apply_controlnet", 1)
          ),
        sampler_name: generation_params.sampler_name,
        scheduler: attrs["scheduler"] || "karras",
        seed: generation_params.seed,
        steps: generation_params.steps
      )
      |> add_latent_scale(generation_params, "second_pass_latent_upscaler",
        samples:
          node_ref(
            "sampler",
            0
          )
      )
      |> add_vae_decode(
        node_ref(
          "sampler",
          0
        ),
        get_vae(attrs),
        "first_pass_vae_decode"
      )
      |> add_image_upscale_with_model("fullscale_upscale_with_model",
        upscale_model:
          node_ref(
            "upscaler",
            0
          ),
        image:
          node_ref(
            "first_pass_vae_decode",
            0
          )
      )
      |> add_image_scale(generation_params, "second_pass_scaler",
        image:
          node_ref(
            if(!has_full_scale_pass or generation_params.hr_upscaler == "None",
              do: "first_pass_vae_decode",
              else: "fullscale_upscale_with_model"
            ),
            0
          )
      )
      |> add_vae_encode(
        node_ref(
          "second_pass_scaler",
          0
        ),
        get_vae(attrs),
        "second_pass_vae_encode"
      )
      |> add_node(
        node("second_pass_inpaint_model_conditioning", "InpaintModelConditioning", %{
          positive:
            node_ref(
              positive_prompt_node_name,
              0
            ),
          negative:
            node_ref(
              "negative_prompt",
              0
            ),
          vae: get_vae(attrs),
          pixels:
            node_ref(
              "second_pass_scaler",
              0
            ),
          mask:
            node_ref(
              "image_to_mask",
              0
            )
        })
      )
      |> add_k_sampler("second_pass_sampler",
        cfg: generation_params.cfg_scale,
        denoise: generation_params.sp_denoising_strength,
        # TODO: for upscaler other than latent use upscale with model flow instead
        latent_image:
          if(generation_params.hr_upscaler == "Latent",
            do: "second_pass_latent_upscaler",
            else:
              if(inpaint_model?(attrs),
                do:
                  node_ref(
                    "second_pass_inpaint_model_conditioning",
                    2
                  ),
                else:
                  node_ref(
                    "second_pass_vae_encode",
                    0
                  )
              )
          ),
        model:
          if(Enum.empty?(positive_loras),
            do:
              if(is_regional_prompting_enabled,
                do: node_ref("attention_couple", 0),
                else:
                  if(Enum.empty?(ip_adapters),
                    do: get_base_model(generation_params.txt2img),
                    else: node_ref("ip_adapter_#{length(ip_adapters) - 1}", 0)
                  )
              ),
            else:
              if(is_regional_prompting_enabled,
                do: node_ref("attention_couple", 0),
                else:
                  if(Enum.empty?(ip_adapters),
                    do: node_ref("positive_lora#{length(positive_loras) - 1}", 0),
                    else: node_ref("ip_adapter_#{length(ip_adapters) - 1}", 0)
                  )
              )
          ),
        positive:
          if(is_nil(controlnet_args) or Enum.empty?(controlnet_args),
            do:
              if(inpaint_model?(attrs),
                do:
                  node_ref(
                    "second_pass_inpaint_model_conditioning",
                    0
                  ),
                else:
                  node_ref(
                    "img2img_vae_encode_node",
                    0
                  )
              ),
            else: [
              "cn#{length(controlnet_args) - 1}_apply_controlnet",
              0
            ]
          ),
        negative:
          if(is_nil(controlnet_args) or Enum.empty?(controlnet_args),
            do:
              if(inpaint_model?(attrs),
                do:
                  node_ref(
                    "second_pass_inpaint_model_conditioning",
                    1
                  ),
                else:
                  node_ref(
                    "img2img_vae_encode",
                    1
                  )
              ),
            else: [
              "cn#{length(controlnet_args) - 1}_apply_controlnet",
              1
            ]
          ),
        sampler_name: generation_params.sampler_name,
        scheduler: attrs["scheduler"] || "karras",
        seed: generation_params.seed,
        steps: generation_params.steps
      )
      |> add_vae_decode(
        node_ref(
          if(
            has_full_scale_pass and not has_ultimate_upscale and
              generation_params.hr_scale < 1,
            do: "second_pass_sampler",
            else: "sampler"
          ),
          0
        ),
        get_vae(attrs),
        "vae_decode"
      )
      |> add_output(
        node_ref(
          if(
            has_ultimate_upscale,
            do: "ultimate_upscale",
            else: "vae_decode"
          ),
          0
        )
      )
      |> maybe_add_controlnet(controlnet_args, generation_params, attrs, !is_nil(controlnet_args),
        positive:
          if(inpaint_model?(attrs),
            do: node_ref("inpaint_model_conditioning", 0),
            else: node_ref("img2img_vae_encode_node", 0)
          ),
        negative:
          if(inpaint_model?(attrs),
            do: node_ref("inpaint_model_conditioning", 1),
            else: node_ref("img2img_vae_encode_node", 1)
          )
      )
      |> maybe_add_ip_adapters(attrs,
        model:
          if(Enum.empty?(positive_loras),
            do:
              if(fooocus_inpaint,
                do: node_ref("apply_fooocus_inpaint", 0),
                else: node_ref("differential_diffusion", 0)
              ),
            else: node_ref("positive_lora#{length(positive_loras) - 1}", 0)
          )
      )
      |> maybe_add_ultimate_upscale(
        generation_params,
        attrs,
        controlnet_args,
        add_condition: has_ultimate_upscale
      )

    # File.write!("./prompt.json", Jason.encode!(prompt, pretty: true))
    prompt
  end

  @spec add_node_input(map(), atom() | binary(), node_value()) :: map()
  def add_node_input(node, input_name, value) do
    node_name = node_name(node)

    node
    |> put_in(
      [node_name, :inputs],
      Map.put(node[node_name].inputs, input_name, value)
    )
  end

  @spec add_node(prompt(), comfy_node(), boolean()) :: prompt()
  def add_node(prompt, node, add \\ true)

  def add_node(prompt, node, true = _add) do
    prompt
    |> put_in([:prompt], Map.merge(prompt.prompt, node))
  end

  def add_node(prompt, _node, false = _add) do
    prompt
  end

  @spec node_name(map()) :: binary()
  def node_name(node) do
    List.first(Map.keys(node))
  end

  @spec add_vae_loader(prompt(), binary(), binary()) :: prompt()
  def add_vae_loader(prompt, vae_name, name \\ "vae") do
    node =
      node(name, "VAELoader")
      |> add_node_input(:vae_name, vae_name)

    prompt
    |> add_node(node)
  end

  @spec add_vae_decode(prompt(), ref_node_value(), ref_node_value(), binary()) :: prompt()
  def add_vae_decode(prompt, samples, vae, name \\ "vae_decode") do
    node =
      node(name, "VAEDecode")
      |> add_node_input(:samples, samples)
      |> add_node_input(:vae, vae)

    prompt
    |> add_node(node)
  end

  @spec add_vae_encode(prompt(), ref_node_value(), ref_node_value(), binary(), [
          {:batch_size, non_neg_integer()}
        ]) :: prompt()
  def add_vae_encode(prompt, pixels, vae, name \\ "vae_encode", options \\ []) do
    node_name = "#{name}_node"

    node =
      node(node_name, "VAEEncode")
      |> add_node_input("pixels", pixels)
      |> add_node_input("vae", vae)

    latent_batch_node =
      node(name, "RepeatLatentBatch")
      |> add_node_input("amount", Keyword.get(options, :batch_size, 1))
      |> add_node_input("samples", node_ref(node_name, 0))

    prompt
    |> add_node(node)
    |> add_node(latent_batch_node)
  end

  @spec add_img2img_vae_encode(prompt(), [
          {:name, binary()}
          | {:positive, binary()}
          | {:negative, binary()}
          | {:pixels, ref_node_value()}
          | {:vae, ref_node_value()}
          | {:batch_size, non_neg_integer()}
        ]) :: prompt()
  def add_img2img_vae_encode(prompt, options \\ []) do
    name = Keyword.get(options, :name, "vae_encode")

    node_name = "#{name}_node"

    node =
      node(node_name, "INPAINT_VAEEncodeInpaintConditioning", %{
        positive: Keyword.get(options, :positive),
        negative: Keyword.get(options, :negative),
        vae: Keyword.get(options, :vae),
        pixels: Keyword.get(options, :pixels),
        mask: Keyword.get(options, :mask)
      })

    latent_batch_node =
      node(name, "RepeatLatentBatch")
      |> add_node_input("amount", Keyword.get(options, :batch_size, 1))
      |> add_node_input("samples", node_ref(node_name, 0))

    prompt
    |> add_node(node)
    |> add_node(latent_batch_node)
  end

  @spec add_model_loader(prompt(), binary(), [
          {:name, binary()} | {:clip_skip, non_neg_integer()}
        ]) ::
          prompt()
  def add_model_loader(prompt, model_name, options \\ []) do
    name = Keyword.get(options, :name, "model")

    node =
      node(name, "CheckpointLoaderSimple", %{
        ckpt_name: model_name
      })

    clip_skip_node =
      node("clip", "CLIPSetLastLayer", %{
        clip: node_ref(name, 1),
        stop_at_clip_layer: -Keyword.get(options, :clip_skip, 1)
      })

    prompt
    |> add_node(node)
    |> add_node(clip_skip_node)
  end

  @spec add_clip_text_encode(prompt(), ref_node_value(), binary(), binary()) :: prompt()
  def add_clip_text_encode(prompt, clip, text, name \\ "prompt") do
    node = node(name, "CLIPTextEncode", %{clip: clip, text: text})

    prompt
    |> add_node(node)
  end

  @spec add_empty_latent_image(prompt(), [
          {:batch_size, non_neg_integer()}
          | {:height, non_neg_integer()}
          | {:width, non_neg_integer()}
          | {:name, binary()}
        ]) :: prompt()
  def add_empty_latent_image(
        prompt,
        options \\ []
      ) do
    node =
      node(Keyword.get(options, :name, "empty_latent_image"), "EmptyLatentImage", %{
        batch_size: Keyword.get(options, :batch_size, 1),
        width: Keyword.get(options, :width),
        height: Keyword.get(options, :height)
      })

    prompt
    |> add_node(node)
  end

  @spec add_k_sampler(prompt(), binary(), [
          {:batch_size, non_neg_integer()}
          | {:cfg, float()}
          | {:denoise, float()}
          | {:latent_image, ref_node_value()}
          | {:model, ref_node_value()}
          | {:positive, ref_node_value()}
          | {:negative, ref_node_value()}
          | {:sampler_name, binary()}
          | {:scheduler, binary()}
          | {:seed, non_neg_integer()}
          | {:step, non_neg_integer()}
          | {:name, binary()}
        ]) :: prompt()
  def add_k_sampler(prompt, name, options \\ []) do
    node =
      node(name, "KSampler", %{
        cfg: Keyword.get(options, :cfg),
        denoise: Keyword.get(options, :denoise),
        latent_image: Keyword.get(options, :latent_image),
        model: Keyword.get(options, :model),
        positive: Keyword.get(options, :positive),
        negative: Keyword.get(options, :negative),
        sampler_name: Keyword.get(options, :sampler_name),
        scheduler: Keyword.get(options, :scheduler),
        seed: Keyword.get(options, :seed),
        steps: Keyword.get(options, :steps)
      })

    prompt
    |> add_node(node)
  end

  @spec add_lora(prompt(), [
          {:model, ref_node_value()}
          | {:clip, ref_node_value()}
          | {:lora_name, binary()}
          | {:strength_model, float()}
          | {:strength_clip, float()}
          | {:name, binary()}
        ]) :: prompt()
  def add_lora(prompt, options \\ []) do
    node =
      node(Keyword.get(options, :name), "LoraLoader", %{
        model: Keyword.get(options, :model),
        clip: Keyword.get(options, :clip),
        lora_name: Keyword.get(options, :lora_name),
        strength_model: Keyword.get(options, :strength_model),
        strength_clip: Keyword.get(options, :strength_clip)
      })

    prompt
    |> add_node(node)
  end

  @spec add_loras(prompt(), map(), [{:is_txt2img, boolean()}]) :: prompt()
  def add_loras(
        prompt,
        %{"positive_loras" => positive_loras} = attrs,
        options \\ []
      ) do
    is_txt2img = Keyword.get(options, :is_txt2img)
    fooocus_inpaint = Map.get(attrs, "fooocus_inpaint", false)

    positive_loras
    |> Enum.with_index()
    |> Enum.reduce(prompt, fn {%{name: name, value: value}, index}, acc_prompt ->
      acc_prompt
      |> add_lora(
        name: "positive_lora#{index}",
        model:
          if(index > 0,
            do: node_ref("positive_lora#{index - 1}", 0),
            else:
              if(not is_txt2img and fooocus_inpaint,
                do: node_ref("apply_fooocus_inpaint", 0),
                else: get_base_model(Keyword.get(options, :is_txt2img))
              )
          ),
        clip:
          if(index > 0,
            do:
              node_ref(
                "positive_lora#{index - 1}",
                1
              ),
            else:
              node_ref(
                "clip",
                0
              )
          ),
        lora_name: "#{name}.safetensors",
        strength_model: value,
        strength_clip: value
      )
    end)
  end

  @spec add_controlnet_loader(
          prompt(),
          binary(),
          [
            {:control_net_name, binary()}
          ]
        ) :: prompt()
  def add_controlnet_loader(prompt, name, options \\ []) do
    node =
      node(name, "ControlNetLoader", %{
        control_net_name: Keyword.get(options, :control_net_name)
      })

    add_node(prompt, node)
  end

  @spec maybe_add_set_union_controlnet_type(
          prompt(),
          binary(),
          boolean(),
          [
            {:control_net, ref_node_value()},
            {:type, binary()}
          ]
        ) :: prompt()
  def maybe_add_set_union_controlnet_type(prompt, name, condition, options \\ [])

  def maybe_add_set_union_controlnet_type(prompt, _name, false, _options) do
    prompt
  end

  def maybe_add_set_union_controlnet_type(prompt, name, _condition, options) do
    node =
      node(name, "SetUnionControlNetType", %{
        control_net: Keyword.get(options, :control_net),
        type: Keyword.get(options, :type)
      })

    add_node(prompt, node)
  end

  @spec add_image_loader(
          prompt(),
          [
            {:name, binary()}
            | {:base64_image, binary()}
          ]
        ) :: prompt()
  @spec add_image_loader(%{
          prompt: %{optional(binary()) => %{class_type: binary(), inputs: map()}}
        }) :: %{prompt: %{optional(binary()) => %{class_type: binary(), inputs: map()}}}
  def add_image_loader(prompt, options \\ []) do
    node =
      node(Keyword.get(options, :name), "Base64ImageInput", %{
        base64_image: Keyword.get(options, :base64_image)
      })

    add_node(prompt, node)
  end

  @spec add_mask_image_loader(
          prompt(),
          [
            {:name, binary()}
            | {:base64_image, binary()}
          ]
        ) :: prompt()
  def add_mask_image_loader(prompt, options \\ []) do
    image_to_mask_name = Keyword.get(options, :name)
    image_loader_name = "#{image_to_mask_name}_image_loader"

    image_to_mask_node =
      node(image_to_mask_name, "ImageToMask", %{
        image: node_ref(image_loader_name, 0),
        channel: "red"
      })

    add_image_loader(prompt, Keyword.put(options, :name, image_loader_name))
    |> add_node(image_to_mask_node)
  end

  @spec maybe_add_image_loader(prompt(), boolean(), keyword()) :: prompt()
  def maybe_add_image_loader(prompt, condition, options \\ [])

  def maybe_add_image_loader(prompt, condition, options) when condition == true do
    add_image_loader(prompt, options)
  end

  def maybe_add_image_loader(prompt, _condition, _options) do
    prompt
  end

  @spec add_controlnet_apply_advanced(prompt(), [
          {:name, binary()}
          | {:strength, float()}
          | {:start_percent, float()}
          | {:guidance_end, float()}
          | {:end_percent, float()}
          | {:positive, ref_node_value()}
          | {:negative, ref_node_value()}
          | {:control_net, ref_node_value()}
          | {:image, ref_node_value()}
          | {:mask, ref_node_value()}
        ]) :: prompt()
  def add_controlnet_apply_advanced(prompt, options \\ []) do
    node =
      node(Keyword.get(options, :name), "ACN_AdvancedControlNetApply", %{
        strength: Keyword.get(options, :strength),
        start_percent: Keyword.get(options, :start_percent),
        end_percent: Keyword.get(options, :end_percent),
        positive: Keyword.get(options, :positive),
        negative: Keyword.get(options, :negative),
        control_net: Keyword.get(options, :control_net),
        image: Keyword.get(options, :image),
        mask_optional: Keyword.get(options, :mask)
      })

    add_node(prompt, node)
  end

  def add_controlnet_apply_advanced_old(prompt, options \\ []) do
    node =
      node(Keyword.get(options, :name), "ControlNetApplyAdvanced", %{
        strength: Keyword.get(options, :strength),
        start_percent: Keyword.get(options, :start_percent),
        end_percent: Keyword.get(options, :end_percent),
        positive: Keyword.get(options, :positive),
        negative: Keyword.get(options, :negative),
        control_net: Keyword.get(options, :control_net),
        image: Keyword.get(options, :image)
      })

    add_node(prompt, node)
  end

  # FIXME: inpaint with second layer (prompts??)
  @spec maybe_add_controlnet(prompt(), list(), GenerationParams.t(), any(), boolean(), [
          {:positive, ref_node_value()} | {:negative, ref_node_value()}
        ]) :: prompt()
  def maybe_add_controlnet(
        prompt,
        controlnet_args,
        generation_params,
        attrs,
        add \\ true,
        options \\ []
      )

  def maybe_add_controlnet(
        prompt,
        _controlnet_args,
        _generation_params,
        _attrs,
        false = _add,
        _options
      ) do
    prompt
  end

  def maybe_add_controlnet(
        prompt,
        controlnet_args,
        %GenerationParams{} = generation_params,
        _attrs,
        true = _add,
        options
      ) do
    positive = Keyword.get(options, :positive)
    negative = Keyword.get(options, :negative)

    active_layers = length(controlnet_args)

    controlnet_args
    |> Enum.with_index()
    |> Enum.reduce(prompt, fn {%ControlNetArgs{} = entry, index}, acc_prompt ->
      acc_prompt
      # TODO: reuse image loader if not overriden
      |> add_image_loader(
        name: "cn#{index}_image",
        base64_image:
          String.replace(
            entry.image || generation_params.init_images |> List.first(),
            ~r/data:image\S+;base64,/i,
            ""
          )
      )
      |> add_mask_image_loader(
        name: "cn#{index}_mask",
        base64_image:
          entry.mask_image &&
            String.replace(
              entry.mask_image,
              ~r/data:image\S+;base64,/i,
              ""
            )
      )
      |> add_controlnet_loader("cn#{entry.model}_controlnet_loader",
        control_net_name: entry.model
      )
      |> maybe_add_set_union_controlnet_type(
        "cn#{index}_union_controlnet_type",
        entry.is_union,
        control_net: node_ref("cn#{entry.model}_controlnet_loader", 0),
        type: entry.union_type
      )
      |> add_controlnet_apply_advanced(
        name: "cn#{index}_apply_controlnet",
        strength: entry.weight,
        start_percent: entry.guidance_start,
        end_percent: entry.guidance_end,
        positive:
          if(active_layers > 1 and index > 0,
            do:
              node_ref(
                "cn#{index - 1}_apply_controlnet",
                0
              ),
            else: positive
          ),
        negative:
          if(active_layers > 1 and index > 0,
            do:
              node_ref(
                "cn#{index - 1}_apply_controlnet",
                1
              ),
            else: negative
          ),
        # TODO: reuse loaded models to avoid loading a model more than once for different layers
        control_net:
          node_ref(
            if(entry.is_union,
              do: "cn#{index}_union_controlnet_type",
              else: "cn#{entry.model}_controlnet_loader"
            ),
            0
          ),
        image:
          node_ref(
            if(
              entry.module == "None",
              do: "cn#{index}_image",
              else: "cn#{index}_preprocessor"
            ),
            0
          ),
        mask: entry.mask_image && node_ref("cn#{index}_mask", 0)
      )
      |> maybe_add_controlnet_preprocessor(index, entry.module,
        name: "cn#{index}_preprocessor",
        add_condition: entry.module != "None",
        resolution:
          if(entry.pixel_perfect,
            do: min(generation_params.width, generation_params.height),
            else: entry.processor_res
          )
      )
    end)
  end

  @spec maybe_add_regional_prompts_with_conditioning(prompt(), map()) :: prompt()
  def maybe_add_regional_prompts_with_conditioning(prompt, attrs) do
    is_regional_prompting_enabled = Map.get(attrs, "is_regional_prompting_enabled", false)
    regional_prompts = Map.get(attrs, "regional_prompts")
    global_prompt_weight = Map.get(attrs, "global_prompt_weight", 0.3)

    if is_regional_prompting_enabled && regional_prompts && not Enum.empty?(regional_prompts) do
      regional_prompts_count = length(regional_prompts)
      positive_loras = Map.get(attrs, "positive_loras")
      # TODO: add regional conditioning and combine

      {new_prompt, last_node_name} =
        Enum.reduce(
          Enum.with_index(regional_prompts),
          {prompt, ""},
          fn {regional_prompt, index}, {acc_prompt, last_node_name} ->
            id = Map.get(regional_prompt, "id")
            prompt = Map.get(regional_prompt, "prompt")
            weight = Map.get(regional_prompt, "weight")
            mask = Map.get(regional_prompt, "mask")

            new_prompt =
              acc_prompt
              |> add_clip_text_encode(
                if(Enum.empty?(positive_loras),
                  do: node_ref("clip", 0),
                  else:
                    node_ref(
                      "positive_lora#{length(positive_loras) - 1}",
                      1
                    )
                ),
                prompt,
                "prompt_region_#{id}_text"
              )
              |> add_conditioning_mask(
                node_ref("prompt_region_#{id}_text", 0),
                mask,
                weight,
                "prompt_region_#{id}"
              )

            {new_prompt, last_node_name} =
              if regional_prompts_count > 1 and index > 0 do
                node_1_name = last_node_name
                node_2_name = "prompt_region_#{id}"

                last_node_name = "regional_prompt_combine_#{id}_#{node_1_name}"

                {new_prompt
                 |> add_conditioning_combine(
                   node_ref(node_1_name, 0),
                   node_ref(node_2_name, 0),
                   "#{last_node_name}"
                 ), last_node_name}
              else
                {new_prompt, "prompt_region_#{id}"}
              end

            {new_prompt, last_node_name}
          end
        )

      new_prompt
      |> add_conditioning_area_strength(
        node_ref("positive_prompt", 0),
        global_prompt_weight,
        "regional_prompt_global_effect"
      )
      |> add_conditioning_combine(
        node_ref("regional_prompt_global_effect", 0),
        node_ref(last_node_name, 0),
        "regional_prompt"
      )
    else
      prompt
    end
  end

  @spec maybe_add_regional_prompts_with_coupling(prompt(), map(), [
          {:base_prompt, ref_node_value()}
          | {:width, non_neg_integer()}
          | {:height, non_neg_integer()}
          | {:is_txt2img, boolean()}
        ]) :: prompt()
  def maybe_add_regional_prompts_with_coupling(prompt, attrs, options \\ []) do
    is_regional_prompting_enabled = Map.get(attrs, "is_regional_prompting_enabled", false)
    regional_prompts = Map.get(attrs, "regional_prompts")
    global_prompt_weight = Map.get(attrs, "global_prompt_weight", 0.3)

    if is_regional_prompting_enabled && regional_prompts && not Enum.empty?(regional_prompts) do
      positive_loras = Map.get(attrs, "positive_loras")
      ip_adapters = Map.get(attrs, "ip_adapters", [])
      fooocus_inpaint = Map.get(attrs, "fooocus_inpaint", false)

      {new_prompt, attention_couple_regions} =
        Enum.reduce(
          regional_prompts,
          {prompt, []},
          fn regional_prompt, {acc_prompt, acc_attention_couple_regions} ->
            id = Map.get(regional_prompt, "id")
            prompt = Map.get(regional_prompt, "prompt")
            weight = Map.get(regional_prompt, "weight")
            mask = Map.get(regional_prompt, "mask")

            new_prompt =
              acc_prompt
              |> add_clip_text_encode(
                if(Enum.empty?(positive_loras),
                  do: node_ref("clip", 0),
                  else:
                    node_ref(
                      "positive_lora#{length(positive_loras) - 1}",
                      1
                    )
                ),
                prompt,
                "attention_couple_region_#{id}_prompt"
              )
              |> add_mask_image_loader(
                name: "attention_couple_region_#{id}_mask",
                base64_image: mask
              )
              |> add_node(
                node("attention_couple_region_#{id}", "AttentionCoupleRegion", %{
                  cond: node_ref("attention_couple_region_#{id}_prompt", 0),
                  mask: node_ref("attention_couple_region_#{id}_mask", 0),
                  weight: weight
                })
              )

            new_attention_couple_regions =
              Enum.concat(
                acc_attention_couple_regions,
                ["attention_couple_region_#{id}"]
              )

            {new_prompt, new_attention_couple_regions}
          end
        )

      new_prompt =
        Enum.chunk_every(attention_couple_regions, 10)
        |> Enum.with_index()
        |> Enum.reduce(new_prompt, fn {regions_batch, index}, acc_prompt ->
          acc_prompt
          |> add_node(
            node(
              "attention_couple_regions_#{index}",
              "AttentionCoupleRegions",
              Map.merge(
                Enum.reduce(Enum.with_index(regions_batch), %{}, fn {region, region_index}, acc ->
                  Map.put(acc, "region_#{region_index + 1}", [region, 0])
                end),
                if(index > 0,
                  do: %{regions: node_ref("attention_couple_regions_#{index - 1}", 0)},
                  else: %{}
                )
              )
            )
          )
        end)

      new_prompt
      |> add_node(
        node(
          "attention_couple",
          "AttentionCouple",
          %{
            global_prompt_weight: global_prompt_weight,
            model:
              if(Enum.empty?(ip_adapters),
                do:
                  if(Enum.empty?(positive_loras),
                    do:
                      if(fooocus_inpaint,
                        do: node_ref("apply_fooocus_inpaint", 0),
                        else: get_base_model(Keyword.get(options, :is_txt2img, true))
                      ),
                    else: node_ref("positive_lora#{length(positive_loras) - 1}", 0)
                  ),
                else: node_ref("ip_adapter_#{length(ip_adapters) - 1}", 0)
              ),
            base_prompt: Keyword.get(options, :base_prompt, node_ref("positive_prompt", 0)),
            width: Keyword.get(options, :width),
            height: Keyword.get(options, :height),
            regions:
              node_ref(
                "attention_couple_regions_#{max(0, ceil(length(attention_couple_regions) / 10) - 1)}",
                0
              ),
            ip_adapter_active: not Enum.empty?(ip_adapters)
          }
        )
      )
    else
      prompt
    end
  end

  @spec add_output(prompt(), ref_node_value(), binary()) :: prompt()
  def add_output(prompt, images, name \\ "output") do
    node =
      node(name, "Base64ImageOutput")
      |> add_node_input(:images, images)

    prompt
    |> add_node(node)
  end

  @spec add_conditioning_area_strength(
          prompt(),
          ref_node_value(),
          non_neg_integer(),
          binary()
        ) :: prompt()
  def add_conditioning_area_strength(prompt, conditioning_prompt, weight, name) do
    node =
      node(name, "ConditioningSetAreaStrength")
      |> add_node_input(:conditioning, conditioning_prompt)
      |> add_node_input(:strength, weight)

    prompt
    |> add_node(node)
  end

  @spec add_conditioning_mask(
          prompt(),
          ref_node_value(),
          binary(),
          non_neg_integer(),
          binary()
        ) :: prompt()
  def add_conditioning_mask(prompt, conditioning_prompt, mask, weight, name) do
    convert_image_to_mask_node =
      image_to_mask_node("#{name}_convert_image_mask", node_ref("#{name}_mask", 0))

    node =
      node(name, "ConditioningSetMask")
      |> add_node_input(:conditioning, conditioning_prompt)
      |> add_node_input(:mask, node_ref("#{name}_convert_image_mask", 0))
      |> add_node_input(:strength, weight)
      |> add_node_input(:set_cond_area, "default")

    prompt
    |> add_node(convert_image_to_mask_node)
    |> add_image_loader(base64_image: mask, name: "#{name}_mask")
    |> add_node(node)
  end

  @spec image_to_mask_node(binary(), ref_node_value()) :: comfy_node()
  def image_to_mask_node(name, image) do
    node(name, "ImageToMask", %{channel: "red", image: image})
  end

  @spec add_conditioning_combine(prompt(), ref_node_value(), ref_node_value(), binary()) ::
          prompt()
  def add_conditioning_combine(prompt, conditioning_1, conditioning_2, name) do
    node =
      node(name, "ConditioningCombine", %{
        conditioning_1: conditioning_1,
        conditioning_2: conditioning_2
      })

    prompt
    |> add_node(node)
  end

  @spec maybe_add_controlnet_preprocessor(
          prompt(),
          non_neg_integer(),
          binary(),
          [{:add_condition, boolean()} | {:name, binary()} | {:resolution, non_neg_integer()}]
        ) ::
          prompt()
  def maybe_add_controlnet_preprocessor(prompt, index, class_type, options) do
    if Keyword.get(options, :add_condition) do
      add_node(
        prompt,
        controlnet_preprocessor(index, class_type, Keyword.delete(options, :add_condition))
      )
    else
      prompt
    end
  end

  @spec controlnet_preprocessor(non_neg_integer(), binary(), [
          {:name, binary()} | {:resolution, non_neg_integer()}
        ]) :: comfy_node()
  def controlnet_preprocessor(index, class_type, options \\ [])

  def controlnet_preprocessor(index, "CannyEdgePreprocessor", options) do
    node(Keyword.get(options, :name), "CannyEdgePreprocessor", %{
      # TODO: link to params
      low_threshold: 100,
      high_threshold: 200,
      image:
        node_ref(
          "cn#{index}_image",
          0
        ),
      resolution: Keyword.get(options, :resolution, 512)
    })
  end

  def controlnet_preprocessor(index, "LineArtPreprocessor", options) do
    node(Keyword.get(options, :name), "LineArtPreprocessor", %{
      # TODO: link to params
      coarse: "disable",
      image:
        node_ref(
          "cn#{index}_image",
          0
        ),
      resolution: Keyword.get(options, :resolution, 512)
    })
  end

  def controlnet_preprocessor(index, "TilePreprocessor", options) do
    node(Keyword.get(options, :name), "TilePreprocessor", %{
      # TODO: link to params
      pyrUp_iters: 1,
      image:
        node_ref(
          "cn#{index}_image",
          0
        ),
      resolution: Keyword.get(options, :resolution, 512)
    })
  end

  def controlnet_preprocessor(index, "InpaintPreprocessor", options) do
    node(Keyword.get(options, :name), "InpaintPreprocessor", %{
      # TODO: link to params
      image:
        node_ref(
          "cn#{index}_image",
          0
        ),
      mask:
        node_ref(
          "image_to_mask",
          0
        )
    })
  end

  def controlnet_preprocessor(index, "Invert", options) do
    node(Keyword.get(options, :name), "ImageInvert", %{
      image:
        node_ref(
          "cn#{index}_image",
          0
        )
    })
  end

  def controlnet_preprocessor(index, preprocessor, options) do
    node(Keyword.get(options, :name), "AIO_Preprocessor", %{
      image:
        node_ref(
          "cn#{index}_image",
          0
        ),
      preprocessor: preprocessor,
      resolution: Keyword.get(options, :resolution, 512)
    })
  end

  @spec maybe_add_scale(prompt(), GenerationParams.t(), nil | boolean(), [
          {:positive_loras, list()}
          | {:controlnet_args, list()}
          | {:attrs, map()}
        ]) ::
          prompt()
  @spec maybe_add_scale(
          %{prompt: %{optional(binary()) => %{class_type: binary(), inputs: map()}}},
          ExSd.Sd.GenerationParams.t(),
          false | nil
        ) :: %{prompt: %{optional(binary()) => %{class_type: binary(), inputs: map()}}}
  def maybe_add_scale(
        prompt,
        %GenerationParams{} = generation_params,
        add_condition \\ true,
        options \\ []
      ) do
    if(add_condition) do
      attrs = Keyword.get(options, :attrs)
      positive_loras = Keyword.get(options, :positive_loras)
      controlnet_args = Keyword.get(options, :controlnet_args)

      is_regional_prompting_enabled = Map.get(attrs, "is_regional_prompting_enabled", false)

      prompt
      |> add_latent_scale(generation_params, "hires_latent_scaler",
        samples:
          node_ref(
            "sampler",
            0
          )
      )
      |> add_vae_decode(node_ref("sampler", 0), get_vae(attrs), "first_pass_vae_decode")
      |> add_image_scale(generation_params, "scaler",
        image:
          node_ref(
            if(generation_params.hr_upscaler == "None" or generation_params.hr_scale < 1,
              do: "first_pass_vae_decode",
              else: "upscale_with_model"
            ),
            0
          )
      )
      |> add_image_upscale_with_model("upscale_with_model",
        upscale_model:
          node_ref(
            "upscaler",
            0
          ),
        image:
          node_ref(
            "first_pass_vae_decode",
            0
          )
      )
      |> add_upscale_model_loader(generation_params.hr_upscaler, "upscaler")
      |> add_vae_encode(node_ref("scaler", 0), get_vae(attrs), "second_pass_vae_encode")
      |> add_k_sampler(
        "hires_sampler",
        cfg: generation_params.cfg_scale,
        denoise: generation_params.sp_denoising_strength,
        latent_image:
          node_ref(
            if(generation_params.hr_upscaler == "Latent",
              do: "hires_latent_scaler",
              else: "second_pass_vae_encode"
            ),
            0
          ),
        model:
          if(Enum.empty?(positive_loras),
            do:
              if(is_regional_prompting_enabled,
                do: node_ref("attention_couple", 0),
                else: get_base_model(generation_params.txt2img)
              ),
            else:
              if(is_regional_prompting_enabled,
                do: node_ref("attention_couple", 0),
                else: node_ref("positive_lora#{length(positive_loras) - 1}", 0)
              )
          ),
        positive:
          if(is_nil(controlnet_args) or Enum.empty?(controlnet_args),
            do:
              node_ref(
                get_positive_prompt(attrs),
                0
              ),
            else:
              node_ref(
                "cn#{length(controlnet_args) - 1}_apply_controlnet",
                0
              )
          ),
        negative:
          if(is_nil(controlnet_args) or Enum.empty?(controlnet_args),
            do:
              node_ref(
                "negative_prompt",
                0
              ),
            else:
              node_ref(
                "cn#{length(controlnet_args) - 1}_apply_controlnet",
                1
              )
          ),
        sampler_name: generation_params.sampler_name,
        scheduler: attrs["scheduler"] || "karras",
        seed: generation_params.seed,
        steps: generation_params.steps
      )
    else
      prompt
    end
  end

  @spec add_latent_scale(prompt(), GenerationParams.t(), binary(), [
          {:samples, ref_node_value()}
          | {:width, non_neg_integer()}
          | {:height, non_neg_integer()}
        ]) ::
          prompt()
  def add_latent_scale(prompt, %GenerationParams{} = generation_params, name, options \\ []) do
    node =
      node(name, "LatentUpscale", %{
        samples: Keyword.get(options, :samples),
        upscale_method: "nearest-exact",
        width:
          Keyword.get(
            options,
            :width,
            ExSd.Sd.SdService.round_to_closest_multiple_of_8_down(
              if(generation_params.hr_scale < 1,
                do: generation_params.width * (1 / generation_params.hr_scale),
                else: generation_params.width * generation_params.hr_scale
              )
            )
          ),
        height:
          Keyword.get(
            options,
            :height,
            ExSd.Sd.SdService.round_to_closest_multiple_of_8_down(
              if(generation_params.hr_scale < 1,
                do: generation_params.height * (1 / generation_params.hr_scale),
                else: generation_params.height * generation_params.hr_scale
              )
            )
          ),
        crop: "disabled"
      })

    prompt
    |> add_node(node)
  end

  @spec add_ip_adapter_unified_loader(prompt(), binary(), [
          {:model, ref_node_value()}
          | {:ipadapter, ref_node_value()}
          | {:preset, binary()}
        ]) ::
          prompt()
  def add_ip_adapter_unified_loader(
        prompt,
        name,
        options \\ []
      ) do
    node =
      node(name, "IPAdapterUnifiedLoader", %{
        model: Keyword.get(options, :model),
        ipadapter: Keyword.get(options, :ipadapter),
        preset: Keyword.get(options, :preset)
      })

    prompt
    |> add_node(node)
  end

  @spec add_ip_adapter(prompt(), binary(), [
          {:model, ref_node_value()}
          | {:ipadapter, ref_node_value()}
          | {:image, ref_node_value()}
          | {:image_negative, ref_node_value()}
          | {:attn_mask, ref_node_value()}
          | {:weight, float()}
          | {:weight_type, binary()}
          | {:start_at, float()}
          | {:end_at, float()}
        ]) ::
          prompt()
  def add_ip_adapter(prompt, name, options \\ []) do
    node =
      node(name, "IPAdapterAdvanced", %{
        model: Keyword.get(options, :model),
        ipadapter: Keyword.get(options, :ipadapter),
        image: Keyword.get(options, :image),
        image_negative: Keyword.get(options, :image_negative),
        attn_mask: Keyword.get(options, :attn_mask),
        weight: Keyword.get(options, :weight),
        weight_type: Keyword.get(options, :weight_type),
        start_at: Keyword.get(options, :start_at),
        end_at: Keyword.get(options, :end_at),
        combine_embeds: "average",
        embeds_scaling: "V only"
      })

    prompt
    |> add_node(node)
  end

  @spec maybe_add_ip_adapters(prompt(), map(), [{:model, ref_node_value()}]) :: prompt()
  def maybe_add_ip_adapters(prompt, attrs, options \\ []) do
    ip_adapters = Map.get(attrs, "ip_adapters", [])

    model = Keyword.get(options, :model)

    ip_adapters
    |> Enum.with_index()
    |> Enum.reduce(prompt, fn {ip_adapter, index}, acc_prompt ->
      preset = Map.get(ip_adapter, "preset")

      acc_prompt
      |> add_ip_adapter_unified_loader("unified_ip_adapter_loader_#{preset}",
        model: model,
        preset: preset
      )
      |> add_image_loader(
        name: "ip_adapter_#{index}_image_loader",
        base64_image: Map.get(ip_adapter, "image")
      )
      |> add_mask_image_loader(
        name: "ip_adapter_#{index}_mask_loader",
        base64_image: Map.get(ip_adapter, "mask")
      )
      |> add_ip_adapter("ip_adapter_#{index}",
        model:
          node_ref(
            if(index === 0,
              do: "unified_ip_adapter_loader_#{preset}",
              else: "ip_adapter_#{index - 1}"
            ),
            0
          ),
        ipadapter: node_ref("unified_ip_adapter_loader_#{preset}", 1),
        image:
          if(Map.get(ip_adapter, "image"),
            do: node_ref("ip_adapter_#{index}_image_loader", 0),
            else: node_ref("image_input", 0)
          ),
        attn_mask:
          if(Map.get(ip_adapter, "mask"),
            do: node_ref("ip_adapter_#{index}_mask_loader", 0),
            else: nil
          ),
        weight: Map.get(ip_adapter, "weight"),
        start_at: Map.get(ip_adapter, "start_at"),
        end_at: Map.get(ip_adapter, "end_at"),
        weight_type: Map.get(ip_adapter, "weight_type")
      )
    end)
  end

  @spec add_image_scale(prompt(), GenerationParams.t(), binary(), [
          {:image, ref_node_value()},
          {:width, non_neg_integer()},
          {:height, non_neg_integer()}
        ]) ::
          prompt()
  def add_image_scale(prompt, %GenerationParams{} = generation_params, name, options \\ []) do
    node =
      node(name, "ImageScale", %{
        # "nearest-exact",
        upscale_method: "lanczos",
        width:
          Keyword.get(
            options,
            :width,
            ExSd.Sd.SdService.round_to_closest_multiple_of_8_down(
              if(generation_params.hr_scale < 1,
                do: generation_params.width * (1 / generation_params.hr_scale),
                else: generation_params.width * generation_params.hr_scale
              )
            )
          ),
        height:
          Keyword.get(
            options,
            :height,
            ExSd.Sd.SdService.round_to_closest_multiple_of_8_down(
              if(generation_params.hr_scale < 1,
                do: generation_params.height * (1 / generation_params.hr_scale),
                else: generation_params.height * generation_params.hr_scale
              )
            )
          ),
        crop: "disabled",
        image: Keyword.get(options, :image)
      })

    prompt
    |> add_node(node)
  end

  @spec add_image_upscale_with_model(prompt(), binary(), [
          {:upscale_model, ref_node_value()} | {:image, ref_node_value()}
        ]) :: prompt()
  def add_image_upscale_with_model(prompt, name, options \\ []) do
    node =
      node(name, "ImageUpscaleWithModel", %{
        upscale_model: Keyword.get(options, :upscale_model),
        image: Keyword.get(options, :image)
      })

    prompt
    |> add_node(node)
  end

  @spec add_upscale_model_loader(prompt(), binary(), binary()) :: none()
  def add_upscale_model_loader(prompt, model_name, name) do
    node =
      node(name, "UpscaleModelLoader", %{
        model_name: model_name
      })

    prompt
    |> add_node(node)
  end

  @spec maybe_add_ultimate_upscale(prompt(), GenerationParams.t(), map(), list(), [
          {:name, binary()},
          {:add_condition, boolean()}
        ]) :: prompt()
  def maybe_add_ultimate_upscale(
        prompt,
        %GenerationParams{} = generation_params,
        attrs,
        controlnet_args,
        options \\ []
      ) do
    add_condition = Keyword.get(options, :add_condition)

    if add_condition do
      is_sd_xl = sd_xl_model?(attrs)

      is_regional_prompting_enabled = Map.get(attrs, "is_regional_prompting_enabled", false)

      positive_loras = Map.get(attrs, "positive_loras")

      ip_adapters = Map.get(attrs, "ip_adapters", [])

      node =
        node(Keyword.get(options, :name, :ultimate_upscale), "UltimateSDUpscaleNoUpscale", %{
          seed: generation_params.seed,
          steps: generation_params.steps,
          cfg: generation_params.cfg_scale,
          sampler_name: generation_params.sampler_name,
          scheduler: attrs["scheduler"] || "karras",
          denoise: generation_params.denoising_strength,
          mode_type: "Linear",
          tile_width: if(is_sd_xl, do: 1024, else: 512),
          tile_height: if(is_sd_xl, do: 1024, else: 512),
          mask_blur: 8,
          tile_padding: 32,
          tiled_decode: "disabled",
          seam_fix_mode: "None",
          seam_fix_denoise: 1,
          seam_fix_width: 64,
          seam_fix_mask_blur: 8,
          seam_fix_padding: 16,
          force_uniform_tiles: "enable",
          upscaled_image:
            node_ref(
              "scaler",
              0
            ),
          model:
            if(Enum.empty?(positive_loras),
              do:
                if(is_regional_prompting_enabled,
                  do: node_ref("attention_couple", 0),
                  else:
                    if(Enum.empty?(ip_adapters),
                      do: get_base_model(generation_params.txt2img),
                      else: node_ref("ip_adapter_#{length(ip_adapters) - 1}", 0)
                    )
                ),
              else:
                if(is_regional_prompting_enabled,
                  do: node_ref("attention_couple", 0),
                  else:
                    if(Enum.empty?(ip_adapters),
                      do: node_ref("positive_lora#{length(positive_loras) - 1}", 0),
                      else: node_ref("ip_adapter_#{length(ip_adapters) - 1}", 0)
                    )
                )
            ),
          positive:
            if(is_nil(controlnet_args) or Enum.empty?(controlnet_args),
              do:
                node_ref(
                  get_positive_prompt(attrs),
                  0
                ),
              else:
                node_ref(
                  "cn#{length(controlnet_args) - 1}_apply_controlnet",
                  0
                )
            ),
          negative:
            if(is_nil(controlnet_args) or Enum.empty?(controlnet_args),
              do:
                node_ref(
                  "negative_prompt",
                  0
                ),
              else:
                node_ref(
                  "cn#{length(controlnet_args) - 1}_apply_controlnet",
                  1
                )
            ),
          vae: get_vae(attrs)
        })

      prompt
      |> add_node(node)
    else
      prompt
    end
  end

  defp get_positive_prompt(_attrs) do
    # is_regional_prompting_enabled = Map.get(attrs, "is_regional_prompting_enabled", false)

    # regional_prompts = Map.get(attrs, "regional_prompts")

    # if(
    #   is_regional_prompting_enabled && regional_prompts &&
    #     not Enum.empty?(regional_prompts),
    #   do: "regional_prompt",
    #   else: "positive_prompt"
    # )
    "positive_prompt"
  end

  defp get_vae(attrs) do
    vae = attrs["vae"]

    if(vae |> String.downcase() == "automatic",
      do: node_ref("model", 2),
      else: node_ref("vae", 0)
    )
  end

  defp inpaint_model?(%{"model" => model_name} = _attrs) do
    model_name
    |> String.downcase()
    |> String.contains?("inpaint")
  end

  defp get_base_model(true = _txt2img) do
    node_ref("model", 0)
  end

  defp get_base_model(false = _txt2img) do
    # TODO: make differential_diffusion configurable
    node_ref("differential_diffusion", 0)
  end

  defp sd_xl_model?(%{"model" => model_name} = _attrs) do
    model_name
    |> String.downcase()
    |> String.contains?("xl")
  end
end
