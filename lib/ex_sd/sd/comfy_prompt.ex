defmodule ExSd.Sd.ComfyPrompt do
  require Logger
  alias ExSd.Sd.SdService
  alias ExSd.Sd.ControlNetArgs
  alias ExSd.Sd.GenerationParams

  @type ref_node_value :: [node_name: binary(), output_id: non_neg_integer()]
  @type comfy_node :: %{binary() => %{class_type: binary(), inputs: node_inputs()}}
  @type node_value :: number() | binary() | ref_node_value()
  @type node_inputs :: %{(atom() | binary() | number() | boolean()) => node_value}
  @type prompt :: %{prompt: comfy_node(), lookup: map()}

  @spec new(comfy_node()) :: prompt()
  def new(initial_nodes \\ %{}) do
    %{prompt: initial_nodes, lookup: %{}}
  end

  @spec node(binary(), binary(), node_inputs(), node_inputs()) :: comfy_node()
  def node(name, class_type, inputs \\ %{}, outputs \\ %{}) do
    %{}
    |> Map.put(name, %{
      class_type: class_type,
      inputs: inputs,
      outputs: outputs
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

    # is_regional_prompting_enabled = Map.get(attrs, "is_regional_prompting_enabled", false)

    # ip_adapters = Map.get(attrs, "ip_adapters", [])

    # regional_prompts = Map.get(attrs, "regional_prompts")
    # is_sd_35 = Regex.match?(~r/3\.?5/i, attrs["model"])

    rescale_cfg_multiplier = Map.get(attrs, "rescale_cfg_multiplier")

    prompt =
      new()
      |> add_vae_loader(attrs["vae"])
      |> add_model_loader(attrs["model"],
        clip_skip: Map.get(attrs, "clip_skip", 1),
        attrs: attrs
      )
      |> add_guidance_group(model: node_ref("model", 0), attrs: attrs)
      |> then(
        &add_loras(&1, attrs,
          is_txt2img: generation_params.txt2img,
          model: get_lookup_value(&1, "guidance_group", "MODEL")
        )
      )
      |> then(
        &add_clip_text_encode(
          &1,
          get_lookup_value(&1, "loras", "CLIP"),
          generation_params.prompt,
          "positive_prompt"
        )
      )
      |> then(
        &add_clip_text_encode(
          &1,
          get_lookup_value(&1, "loras", "CLIP"),
          generation_params.negative_prompt,
          "negative_prompt"
        )
      )
      |> then(
        &maybe_add_instant_id(&1, attrs,
          model: get_lookup_value(&1, "loras", "MODEL"),
          positive: get_lookup_value(&1, "positive_prompt", "CONDITIONING"),
          negative: get_lookup_value(&1, "negative_prompt", "CONDITIONING")
        )
      )
      |> then(
        &maybe_add_ip_adapters(&1, attrs,
          model: get_lookup_value(&1, "apply_instant_id_advanced", "MODEL")
        )
      )
      |> then(
        &maybe_add_regional_prompts_with_coupling(&1, attrs,
          width: generation_params.width,
          height: generation_params.height,
          is_txt2img: generation_params.txt2img,
          clip: get_lookup_value(&1, "loras", "CLIP"),
          model: get_lookup_value(&1, "ip_adapters", "MODEL")
        )
      )
      |> then(
        &maybe_add_regional_prompts_with_conditioning(&1, attrs,
          clip: get_lookup_value(&1, "loras", "CLIP")
        )
      )
      |> add_empty_latent_image(
        batch_size: generation_params.batch_size,
        width: generation_params.width,
        height: generation_params.height
      )
      |> then(
        &maybe_add_controlnet(
          &1,
          controlnet_args,
          generation_params,
          attrs,
          #!is_nil(controlnet_args),
          positive: get_lookup_value(&1, "apply_instant_id_advanced", "positive"),
          negative: get_lookup_value(&1, "apply_instant_id_advanced", "negative")
        )
      )
      |> then(
        &maybe_add_rescale_cfg(&1,
          model: get_lookup_value(&1, "regional_prompting", "MODEL"),
          multiplier: rescale_cfg_multiplier,
          add: rescale_cfg_multiplier && rescale_cfg_multiplier < 1
        )
      )
      |> then(
        &add_k_sampler(
          &1,
          "sampler",
          cfg: generation_params.cfg_scale,
          denoise: 1,
          latent_image: get_lookup_value(&1, "empty_latent_image", "LATENT"),
          model: get_lookup_value(&1, "rescale_cfg", "MODEL"),
          # if(Enum.empty?(positive_loras),
          #   do:
          #     if(is_regional_prompting_enabled && !is_sd_35,
          #       do: get_lookup_value(&1, "regional_prompting", "MODEL"),
          #       else:
          #         if(Enum.empty?(ip_adapters),
          #           do:
          #             if(is_skimmed_cfg_enabled,
          #               do: node_ref("skimmed_cfg", 0),
          #               else: get_base_model(generation_params.txt2img)
          #             ),
          #           else:
          #             get_lookup_value(&1, get_last_ip_adapter_node_name(ip_adapters), "MODEL")
          #         )
          #     ),
          #   else:
          #     if(is_regional_prompting_enabled && !is_sd_35,
          #       do: get_lookup_value(&1, "regional_prompting", "MODEL"),
          #       else:
          #         if(Enum.empty?(ip_adapters),
          #           do:
          #             if(is_skimmed_cfg_enabled,
          #               do: node_ref("skimmed_cfg", 0),
          #               else: node_ref("positive_lora#{length(positive_loras) - 1}", 0)
          #             ),
          #           else:
          #             get_lookup_value(
          #               &1,
          #               get_last_ip_adapter_node_name(ip_adapters),
          #               "MODEL"
          #             )
          #         )
          #     )
          # ),
          positive: get_lookup_value(&1, "controlnets", "positive"),
          # if(is_nil(controlnet_args) or Enum.empty?(controlnet_args),
          #   do:
          #     if(is_regional_prompting_enabled && is_sd_35,
          #       do:
          #         node_ref(
          #           "regional_prompt",
          #           0
          #         ),
          #       else:
          #         node_ref(
          #           get_positive_prompt(attrs),
          #           0
          #         )
          #     ),
          #   else:
          #     node_ref(
          #       "cn#{length(controlnet_args) - 1}_apply_controlnet",
          #       0
          #     )
          # ),
          negative: get_lookup_value(&1, "controlnets", "negative"),
          # if(is_nil(controlnet_args) or Enum.empty?(controlnet_args),
          #   do:
          #     node_ref(
          #       "negative_prompt",
          #       0
          #     ),
          #   else:
          #     node_ref(
          #       "cn#{length(controlnet_args) - 1}_apply_controlnet",
          #       1
          #     )
          # ),
          sampler_name: generation_params.sampler_name,
          scheduler: attrs["scheduler"] || "karras",
          seed: generation_params.seed,
          steps: generation_params.steps
        )
      )
      |> maybe_add_scale(generation_params, generation_params.hr_scale != 1,
        attrs: attrs,
        positive_loras: positive_loras,
        controlnet_args: controlnet_args
      )
      |> then(
        &add_vae_decode(
          &1,
          if(
            Map.get(attrs, "scale") > 1 or
              (Map.get(attrs, "scale") < 1 and full_scale_pass),
            do: get_lookup_value(&1, "hires_sampler", "LATENT"),
            else: get_lookup_value(&1, "sampler", "LATENT")
          ),
          get_vae(attrs)
        )
      )
      |> then(&add_output(&1, get_lookup_value(&1, "vae_decode", "IMAGE")))

    # |> then(
    #   &add_node(
    #     &1,
    #     node("save", "SaveImage", %{
    #       "filename_prefix" => "A8R8",
    #       "images" => get_lookup_value(&1, "vae_decode", "IMAGE")
    #     })
    #   )
    # )

    # File.write!("./prompt.json", Jason.encode!(prompt, pretty: true))
    prompt
  end

  @spec flux_txt2img(GenerationParams.t(), map()) :: prompt()
  def flux_txt2img(%GenerationParams{} = generation_params, attrs) do
    positive_loras = Map.get(attrs, "positive_loras")

    is_regional_prompting_enabled = Map.get(attrs, "is_regional_prompting_enabled", false)
    is_split_render = get_in(attrs, ["split_render", "is_enabled"]) || false
    is_skimmed_cfg_enabled = get_in(attrs, ["skimmed_cfg", "is_enabled"]) || false

    # clip_models = Map.get(attrs, "clip_models", [])

    full_scale_pass = Map.get(attrs, "full_scale_pass", false)
    is_tea_cache_enabled = Map.get(attrs, "is_tea_cache_enabled", false)

    prompt =
      new()
      |> add_vae_loader(attrs["vae"])
      |> add_model_loader(attrs["model"], attrs: attrs, type: :flux)
      |> add_loras(attrs, is_txt2img: generation_params.txt2img, model: node_ref("model", 0))
      |> then(
        &maybe_add_tea_cache(&1,
          model: get_lookup_value(&1, "loras", "MODEL"),
          add: is_tea_cache_enabled
        )
      )
      |> then(
        &add_clip_text_encode(
          &1,
          get_lookup_value(&1, "loras", "CLIP"),
          generation_params.prompt,
          "prompt"
        )
      )
      |> then(
        &maybe_add_regional_prompts_with_conditioning(&1, attrs,
          clip: get_lookup_value(&1, "loras", "CLIP"),
          global_prompt: node_ref("prompt", 0)
        )
      )
      |> add_node(
        node("flux_guidance", "FluxGuidance", %{
          conditioning:
            if(is_regional_prompting_enabled,
              do: node_ref("regional_prompt", 0),
              else: node_ref("prompt", 0)
            ),
          guidance: generation_params.flux_guidance
        })
      )
      |> add_node(
        node("negative_prompt", "ConditioningZeroOut", %{
          conditioning: node_ref("flux_guidance", 0)
        })
      )
      |> then(
        &maybe_add_skimmed_cfg(&1,
          name: "skimmed_cfg",
          model: get_lookup_value(&1, "tea_cache", "MODEL"),
          skimming_cfg: get_in(attrs, ["skimmed_cfg", "skimming_cfg"]) || 6,
          full_skim_negative: get_in(attrs, ["skimmed_cfg", "full_skim_negative"]),
          disable_flipping_filter: get_in(attrs, ["skimmed_cfg", "disable_flipping_filter"]),
          add: is_skimmed_cfg_enabled
        )
      )
      |> then(
        &add_node(
          &1,
          node("cfg_guider", "CFGGuider", %{
            model: get_lookup_value(&1, "skimmed_cfg", "MODEL"),
            positive: node_ref("flux_guidance", 0),
            negative: node_ref("negative_prompt", 0),
            cfg: generation_params.cfg_scale
          })
        )
      )
      |> then(
        &add_node(
          &1,
          node("cfg_guider_split", "CFGGuider", %{
            model: get_lookup_value(&1, "skimmed_cfg", "MODEL"),
            positive: node_ref("flux_guidance", 0),
            negative: node_ref("negative_prompt", 0),
            cfg: generation_params.cfg_scale
          })
        )
      )
      # |> add_node(
      #   node("basic_guider", "BasicGuider", %{
      #     model:
      #       if(Enum.empty?(positive_loras),
      #         do: node_ref("model", 0),
      #         else: node_ref("positive_lora#{length(positive_loras) - 1}", 0)
      #       ),
      #     conditioning: node_ref("flux_guidance", 0)
      #   })
      # )
      |> then(
        &add_node(
          &1,
          node("basic_scheduler", "BasicScheduler", %{
            model: get_lookup_value(&1, "skimmed_cfg", "MODEL"),
            scheduler: generation_params.scheduler,
            steps: generation_params.steps,
            denoise: 1.0
          })
        )
      )
      |> add_node(
        node("split_sigmas_denoise", "SplitSigmasDenoise", %{
          sigmas: node_ref("basic_scheduler", 0),
          denoise: get_in(attrs, ["split_render", "split_ratio"]) || 0.45
        }),
        is_split_render
      )
      |> add_node(
        node("noise", "RandomNoise", %{
          noise_seed: generation_params.seed,
          control_after_generate: "fixed"
        })
      )
      |> add_node(
        node("sampler", "KSamplerSelect", %{
          sampler_name: generation_params.sampler_name
        })
      )
      |> add_empty_latent_image(
        name: "latent_image",
        width: generation_params.width,
        height: generation_params.height,
        batch_size: generation_params.batch_size
      )
      |> add_node(
        node("sampler_advanced", "SamplerCustomAdvanced", %{
          noise: node_ref("noise", 0),
          sampler: node_ref("sampler", 0),
          guider: node_ref("cfg_guider", 0),
          sigmas:
            if(is_split_render,
              do: node_ref("split_sigmas_denoise", 0),
              else: node_ref("basic_scheduler", 0)
            ),
          latent_image: node_ref("latent_image", 0)
        })
      )
      |> add_node(
        node("inject_noise", "InjectLatentNoise+", %{
          latent: node_ref("sampler_advanced", 0),
          noise_seed: SdService.create_seed(),
          noise_strength: get_in(attrs, ["split_render", "noise_injection_strength"]),
          normalize: "false"
        })
      )
      |> add_node(node("disable_noise", "DisableNoise"), is_split_render)
      |> add_node(
        node(
          "sampler_advanced_split",
          "SamplerCustomAdvanced",
          %{
            noise: node_ref("disable_noise", 0),
            sampler: node_ref("sampler", 0),
            guider: node_ref("cfg_guider_split", 0),
            sigmas: node_ref("split_sigmas_denoise", 1),
            latent_image: node_ref("inject_noise", 0)
          }
        ),
        is_split_render
      )
      |> then(
        &maybe_add_scale(&1, generation_params, generation_params.hr_scale != 1,
          model: get_lookup_value(&1, "skimmed_cfg", "MODEL"),
          attrs: attrs,
          positive_loras: positive_loras,
          first_pass_samples:
            if(is_split_render,
              do: node_ref("sampler_advanced_split", 1),
              else: node_ref("sampler_advanced", 1)
            ),
          positive_prompt: node_ref("flux_guidance", 0),
          negative_prompt: node_ref("negative_prompt", 0)
        )
      )
      |> add_vae_decode(
        if(
          Map.get(attrs, "scale") > 1 or
            (Map.get(attrs, "scale") < 1 and full_scale_pass),
          do: node_ref("hires_sampler", 0),
          else:
            if(is_split_render,
              do: node_ref("sampler_advanced_split", 1),
              else: node_ref("sampler_advanced", 1)
            )
        ),
        node_ref("vae", 0),
        "vae_decode"
      )
      |> add_output(node_ref("vae_decode", 0))

    # |> then(
    #   &add_node(
    #     &1,
    #     node("save", "SaveImage", %{
    #       "filename_prefix" => "A8R8",
    #       "images" =>
    #         node_ref(
    #           "vae_decode",
    #           0
    #         )
    #     })
    #   )
    # )

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

    has_ultimate_upscale = get_in(attrs, ["ultimate_upscale", "is_enabled"]) || false

    # is_sd_xl = attrs["model"] |> String.downcase() |> String.contains?("xl")

    is_regional_prompting_enabled = Map.get(attrs, "is_regional_prompting_enabled", false)

    positive_prompt_node_name = get_positive_prompt(attrs)

    ip_adapters = Map.get(attrs, "ip_adapters", [])
    fooocus_inpaint = Map.get(attrs, "fooocus_inpaint", false)
    is_skimmed_cfg_enabled = get_in(attrs, ["skimmed_cfg", "is_enabled"]) || false
    is_tiled_diffusion_enabled = get_in(attrs, ["tiled_diffusion", "is_enabled"]) || false
    rescale_cfg_multiplier = Map.get(attrs, "rescale_cfg_multiplier")

    # SdService.create_seed()
    seed = generation_params.seed

    has_latent_upscaler =
      not has_ultimate_upscale and generation_params.hr_upscaler == "Latent" and
        attrs["scale"] != 1

    prompt =
      new()
      |> add_model_loader(attrs["model"], clip_skip: Map.get(attrs, "clip_skip", 1), attrs: attrs)
      |> add_guidance_group(model: node_ref("model", 0), attrs: attrs)
      |> then(
        &maybe_add_tiled_diffusion(&1,
          model: get_lookup_value(&1, "guidance_group", "MODEL"),
          add: is_tiled_diffusion_enabled,
          attrs: attrs
        )
      )
      |> then(
        &maybe_add_skimmed_cfg(&1,
          name: "skimmed_cfg",
          model: get_lookup_value(&1, "tiled_diffusion", "MODEL"),
          skimming_cfg: get_in(attrs, ["skimmed_cfg", "skimming_cfg"]) || 6,
          full_skim_negative: get_in(attrs, ["skimmed_cfg", "full_skim_negative"]),
          disable_flipping_filter: get_in(attrs, ["skimmed_cfg", "disable_flipping_filter"]),
          add: is_skimmed_cfg_enabled
        )
      )
      |> then(
        &add_node(
          &1,
          node("differential_diffusion", "DifferentialDiffusion", %{
            model: get_lookup_value(&1, "skimmed_cfg", "MODEL")
          })
          |> add_node_output(
            "MODEL",
            node_ref("differential_diffusion", 0)
          )
        )
      )
      |> then(
        &add_loras(&1, attrs,
          is_txt2img: generation_params.txt2img,
          model: get_lookup_value(&1, "differential_diffusion", "MODEL")
        )
      )
      |> then(
        &add_clip_text_encode(
          &1,
          get_lookup_value(&1, "loras", "CLIP"),
          generation_params.prompt,
          "positive_prompt"
        )
      )
      |> then(
        &add_clip_text_encode(
          &1,
          get_lookup_value(&1, "loras", "CLIP"),
          generation_params.prompt,
          "negative_prompt"
        )
      )
      |> then(
        &maybe_add_instant_id(&1, attrs,
          model: get_lookup_value(&1, "loras", "MODEL"),
          positive: get_lookup_value(&1, "positive_prompt", "CONDITIONING"),
          negative: get_lookup_value(&1, "negative_prompt", "CONDITIONING")
        )
      )
      |> add_vae_loader(attrs["vae"])
      |> then(
        &maybe_add_ip_adapters(&1, attrs,
          model: get_lookup_value(&1, "apply_instant_id_advanced", "MODEL")
        )
      )
      |> add_image_loader(
        name: "image_input",
        base64_image:
          String.replace(
            List.first(generation_params.init_images),
            ~r/data:image\S+;base64,/i,
            ""
          )
      )
      |> add_upscale_model_loader(generation_params.hr_upscaler, "upscaler")
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
          ),
        add: generation_params.hr_upscaler != "Latent"
      )
      |> then(
        &maybe_add_image_scale(
          &1,
          generation_params,
          "scaler",
          generation_params.hr_scale != 1 or
            (generation_params.hr_upscaler != "None" && generation_params.hr_upscaler != "Latent"),
          image:
            if(generation_params.hr_upscaler == "None" or generation_params.hr_scale < 1,
              do: node_ref("image_input", 0),
              else: get_lookup_value(&1, "upscale_with_model", "IMAGE")
            ),
          width: generation_params.width,
          height: generation_params.height
        )
      )
      |> then(
        &maybe_add_controlnet(
          &1,
          controlnet_args,
          generation_params,
          attrs,
          positive: get_lookup_value(&1, "apply_instant_id_advanced", "positive"),
          # if(inpaint_model?(attrs),
          #   do: node_ref("inpaint_model_conditioning", 0),
          #   else: node_ref("img2img_vae_encode_node", 0)
          # ),
          negative: get_lookup_value(&1, "apply_instant_id_advanced", "negative")
          # if(inpaint_model?(attrs),
          #   do: node_ref("inpaint_model_conditioning", 1),
          #   else: node_ref("img2img_vae_encode_node", 1)
          # )
        )
      )

      # |> maybe_add_image_scale(
      #   generation_params,
      #   "scaler",
      #   generation_params.hr_upscaler != "None" and
      #     (generation_params.hr_upscaler != "Latent" or generation_params.hr_scale != 1),
      #   image:
      #     node_ref(
      #       if(generation_params.hr_upscaler == "None" or generation_params.hr_scale < 1,
      #         do: "image_input",
      #         else: "upscale_with_model"
      #       ),
      #       0
      #     ),
      #   width: generation_params.width,
      #   height: generation_params.height
      # )
      |> then(
        &add_img2img_vae_encode(&1,
          pixels: get_lookup_value(&1, "scaler", "IMAGE"),
          vae: get_vae(attrs),
          name: "img2img_vae_encode",
          batch_size: generation_params.batch_size,
          positive: get_lookup_value(&1, "controlnets", "positive"),
          negative: get_lookup_value(&1, "controlnets", "negative"),
          mask:
            node_ref(
              "image_to_mask",
              0
            )
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
      # |> add_node(
      #   node("inpaint_model_conditioning", "InpaintModelConditioning", %{
      #     positive:
      #       if(is_nil(controlnet_args) or Enum.empty?(controlnet_args),
      #         do:
      #           if(inpaint_model?(attrs),
      #             do:
      #               node_ref(
      #                 "second_pass_inpaint_model_conditioning",
      #                 0
      #               ),
      #             else:
      #               node_ref(
      #                 positive_prompt_node_name,
      #                 0
      #               )
      #           ),
      #         else: [
      #           "cn#{length(controlnet_args) - 1}_apply_controlnet",
      #           0
      #         ]
      #       ),
      #     negative:
      #       if(is_nil(controlnet_args) or Enum.empty?(controlnet_args),
      #         do:
      #           if(inpaint_model?(attrs),
      #             do:
      #               node_ref(
      #                 "inpaint_model_conditioning",
      #                 1
      #               ),
      #             else:
      #               node_ref(
      #                 "negative_prompt",
      #                 0
      #               )
      #           ),
      #         else: [
      #           "cn#{length(controlnet_args) - 1}_apply_controlnet",
      #           1
      #         ]
      #       ),
      #     vae: get_vae(attrs),
      #     pixels:
      #       node_ref(
      #         if(
      #           has_ultimate_upscale or
      #             attrs["scale"] == 1 or
      #             generation_params.hr_upscaler == "Latent",
      #           do: "image_input",
      #           else: "scaler"
      #         ),
      #         0
      #       ),
      #     mask:
      #       node_ref(
      #         "image_to_mask",
      #         0
      #       ),
      #     noise_mask: true
      #   })
      # )
      # |> add_node(
      #   node("inpaint_latent_batch", "RepeatLatentBatch", %{
      #     amount: generation_params.batch_size,
      #     samples: node_ref("img2img_vae_encode_node", 3)
      #   })
      # )
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
      |> then(
        &maybe_add_latent_scale(
          &1,
          generation_params,
          "latent_upscaler",
          has_latent_upscaler,
          samples:
            get_lookup_value(
              &1,
              "img2img_vae_encode",
              "latent_samples"
            )
        )
      )
      |> then(
        &maybe_add_regional_prompts_with_coupling(&1, attrs,
          base_prompt: get_lookup_value(&1, "img2img_vae_encode", "positive"),
          width: generation_params.width,
          height: generation_params.height,
          is_txt2img: generation_params.txt2img,
          clip: get_lookup_value(&1, "loras", "CLIP"),
          model: get_lookup_value(&1, "ip_adapters", "MODEL")
        )
      )
      |> then(
        &maybe_add_fooocus_inpaint(
          &1,
          name: "apply_fooocus_inpaint",
          model: get_lookup_value(&1, "regional_prompting", "MODEL"),
          latent:
            if(has_latent_upscaler,
              do:
                get_lookup_value(
                  &1,
                  "latent_upscaler",
                  "LATENT"
                ),
              else:
                get_lookup_value(
                  &1,
                  "img2img_vae_encode",
                  "latent_inpaint"
                )
            ),
          add: fooocus_inpaint
        )
      )

      # |> then(
      #   &maybe_add_perturbed_attention_guidance(&1,
      #     model: get_lookup_value(&1, "apply_fooocus_inpaint", "MODEL"),
      #     add: fooocus_inpaint
      #     # scale: 3
      #   )
      # )
      |> then(
        &maybe_add_rescale_cfg(&1,
          model: get_lookup_value(&1, "apply_fooocus_inpaint", "MODEL"),
          multiplier: rescale_cfg_multiplier,
          add: rescale_cfg_multiplier && rescale_cfg_multiplier < 1
        )
      )
      |> then(
        &add_k_sampler(&1, "sampler",
          cfg: generation_params.cfg_scale,
          denoise: generation_params.denoising_strength,
          latent_image:
            if(
              not has_ultimate_upscale and generation_params.hr_upscaler == "Latent" and
                attrs["scale"] != 1,
              do: ["latent_upscaler", 0],
              else: get_lookup_value(&1, "img2img_vae_encode", "latent_samples")
            ),
          model: get_lookup_value(&1, "rescale_cfg", "MODEL"),
          # if(Enum.empty?(positive_loras),
          #   do:
          #     if(is_regional_prompting_enabled,
          #       do: node_ref("attention_couple", 0),
          #       else:
          #         if(Enum.empty?(ip_adapters),
          #           do:
          #             if(not generation_params.txt2img and fooocus_inpaint,
          #               do: node_ref("apply_fooocus_inpaint", 0),
          #               else: get_base_model(generation_params.txt2img)
          #             ),
          #           else: node_ref("ip_adapter_#{length(ip_adapters) - 1}", 0)
          #         )
          #     ),
          #   else:
          #     if(is_regional_prompting_enabled,
          #       do: node_ref("attention_couple", 0),
          #       else:
          #         if(Enum.empty?(ip_adapters),
          #           do: node_ref("positive_lora#{length(positive_loras) - 1}", 0),
          #           else: node_ref("ip_adapter_#{length(ip_adapters) - 1}", 0)
          #         )
          #     )
          # ),
          positive: node_ref("img2img_vae_encode_node", 0),
          negative: node_ref("img2img_vae_encode_node", 1),
          sampler_name: generation_params.sampler_name,
          scheduler: attrs["scheduler"] || "karras",
          # generation_params.seed,
          seed: seed,
          steps: generation_params.steps
        )
      )
      |> maybe_add_latent_scale(
        generation_params,
        "second_pass_latent_upscaler",
        generation_params.hr_upscaler == "Latent",
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
      |> maybe_add_image_scale(
        generation_params,
        "second_pass_scaler",
        true,
        image:
          node_ref(
            if(!has_full_scale_pass or generation_params.hr_upscaler == "None",
              do: "first_pass_vae_decode",
              else: "fullscale_upscale_with_model"
            ),
            0
          )
      )
      # |> add_vae_encode(
      #   node_ref(
      #     "second_pass_scaler",
      #     0
      #   ),
      #   get_vae(attrs),
      #   "second_pass_vae_encode"
      # )
      |> then(
        &add_img2img_vae_encode(&1,
          name: "second_pass_vae_encode",
          pixels:
            get_lookup_value(
              &1,
              "second_pass_scaler",
              "IMAGE"
            ),
          vae: get_vae(attrs),
          batch_size: generation_params.batch_size,
          positive: get_lookup_value(&1, "controlnets", "positive"),
          negative: get_lookup_value(&1, "controlnets", "negative"),
          mask:
            node_ref(
              "image_to_mask",
              0
            )
        )
      )
      |> then(
        &maybe_add_fooocus_inpaint(
          &1,
          name: "second_pass_apply_fooocus_inpaint",
          model: get_lookup_value(&1, "regional_prompting", "MODEL"),
          latent: get_lookup_value(&1, "second_pass_vae_encode", "latent_inpaint"),
          add: fooocus_inpaint
        )
      )

      # |> add_node(
      #   node("second_pass_inpaint_model_conditioning", "InpaintModelConditioning", %{
      #     positive:
      #       node_ref(
      #         positive_prompt_node_name,
      #         0
      #       ),
      #     negative:
      #       node_ref(
      #         "negative_prompt",
      #         0
      #       ),
      #     vae: get_vae(attrs),
      #     pixels:
      #       node_ref(
      #         "second_pass_scaler",
      #         0
      #       ),
      #     mask:
      #       node_ref(
      #         "image_to_mask",
      #         0
      #       )
      #   })
      # )
      |> then(
        &add_k_sampler(&1, "second_pass_sampler",
          cfg: generation_params.cfg_scale,
          denoise: generation_params.sp_denoising_strength,
          # TODO: for upscaler other than latent use upscale with model flow instead
          latent_image:
            if(generation_params.hr_upscaler == "Latent",
              do: node_ref("second_pass_latent_upscaler", 0),
              else: get_lookup_value(&1, "second_pass_vae_encode", "latent_samples")
            ),
          model: get_lookup_value(&1, "second_pass_apply_fooocus_inpaint", "MODEL"),
          positive: get_lookup_value(&1, "second_pass_vae_encode", "positive"),
          negative: get_lookup_value(&1, "second_pass_vae_encode", "negative"),
          sampler_name: generation_params.sampler_name,
          scheduler: attrs["scheduler"] || "karras",
          seed: seed,
          steps: generation_params.steps
        )
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
      |> then(
        &maybe_add_ultimate_upscale(
          &1,
          generation_params,
          attrs,
          controlnet_args,
          add_condition: has_ultimate_upscale,
          upscaled_image: get_lookup_value(&1, "scaler", "IMAGE")
        )
      )

    # |> then(
    #   &add_node(
    #     &1,
    #     node("save", "SaveImage", %{
    #       "filename_prefix" => "A8R8",
    #       "images" =>
    #         node_ref(
    #           if(
    #             has_ultimate_upscale,
    #             do: "ultimate_upscale",
    #             else: "vae_decode"
    #           ),
    #           0
    #         )
    #     })
    #   )
    # )

    # |> then(
    #   &add_node(
    #     &1,
    #     node("save", "SaveImage", %{
    #       "filename_prefix" => "A8R8",
    #       "images" =>
    #         node_ref(
    #           if(
    #             has_ultimate_upscale,
    #             do: "ultimate_upscale",
    #             else: "vae_decode"
    #           ),
    #           0
    #         )
    #     })
    #   )
    # )

    # File.write!("./prompt.json", Jason.encode!(prompt, pretty: true))
    prompt
  end

  @spec flux_img2img(GenerationParams.t(), map()) :: prompt()
  def flux_img2img(%GenerationParams{} = generation_params, attrs) do
    positive_loras = Map.get(attrs, "positive_loras")

    has_ultimate_upscale = get_in(attrs, ["ultimate_upscale", "is_enabled"]) || false
    full_scale_pass = Map.get(attrs, "full_scale_pass", false)
    has_full_scale_pass = full_scale_pass and attrs["scale"] < 1

    is_regional_prompting_enabled = Map.get(attrs, "is_regional_prompting_enabled", false)

    is_skimmed_cfg_enabled = get_in(attrs, ["skimmed_cfg", "is_enabled"]) || false
    is_tea_cache_enabled = Map.get(attrs, "is_tea_cache_enabled", false)
    is_tiled_diffusion_enabled = get_in(attrs, ["tiled_diffusion", "is_enabled"]) || false

    prompt =
      new()
      |> add_vae_loader(attrs["vae"])
      |> add_model_loader(attrs["model"], attrs: attrs, type: :flux)
      |> add_node(
        node("differential_diffusion", "DifferentialDiffusion", %{
          model: node_ref("model", 0)
        })
      )
      |> add_loras(attrs,
        is_txt2img: generation_params.txt2img,
        model: node_ref("differential_diffusion", 0)
      )
      |> then(
        &maybe_add_tea_cache(&1,
          model: get_lookup_value(&1, "loras", "MODEL"),
          add: is_tea_cache_enabled
        )
      )
      |> then(
        &add_clip_text_encode(
          &1,
          get_lookup_value(&1, "loras", "CLIP"),
          generation_params.prompt,
          "positive_prompt"
        )
      )
      |> then(
        &maybe_add_regional_prompts_with_conditioning(&1, attrs,
          clip: get_lookup_value(&1, "loras", "CLIP"),
          global_prompt: node_ref("positive_prompt", 0)
        )
      )
      |> add_node(
        node("flux_guidance", "FluxGuidance", %{
          conditioning:
            if(is_regional_prompting_enabled,
              do: node_ref("regional_prompt", 0),
              else: node_ref("positive_prompt", 0)
            ),
          guidance: generation_params.flux_guidance
        })
      )
      |> add_node(
        node("negative_prompt", "ConditioningZeroOut", %{
          conditioning: node_ref("flux_guidance", 0)
        })
      )
      |> then(
        &maybe_add_tiled_diffusion(&1,
          model: get_lookup_value(&1, "tea_cache", "MODEL"),
          add: is_tiled_diffusion_enabled,
          attrs: attrs
        )
      )
      |> then(
        &maybe_add_skimmed_cfg(&1,
          name: "skimmed_cfg",
          model: get_lookup_value(&1, "tiled_diffusion", "MODEL"),
          skimming_cfg: get_in(attrs, ["skimmed_cfg", "skimming_cfg"]) || 6,
          full_skim_negative: get_in(attrs, ["skimmed_cfg", "full_skim_negative"]),
          disable_flipping_filter: get_in(attrs, ["skimmed_cfg", "disable_flipping_filter"]),
          add: is_skimmed_cfg_enabled
        )
      )
      |> then(
        &add_node(
          &1,
          node("cfg_guider", "CFGGuider", %{
            model: get_lookup_value(&1, "skimmed_cfg", "MODEL"),
            positive: node_ref("img2img_vae_encode_node", 0),
            negative: node_ref("img2img_vae_encode_node", 1),
            cfg: generation_params.cfg_scale
          })
        )
      )
      # |> add_node(
      #   node("basic_guider", "BasicGuider", %{
      #     model:
      #       if(Enum.empty?(positive_loras),
      #         do: node_ref("model", 0),
      #         else: node_ref("positive_lora#{length(positive_loras) - 1}", 0)
      #       ),
      #     conditioning: node_ref("img2img_vae_encode_node", 0)
      #   })
      # )
      |> then(
        &add_node(
          &1,
          node("basic_scheduler", "BasicScheduler", %{
            model: get_lookup_value(&1, "skimmed_cfg", "MODEL"),
            scheduler: generation_params.scheduler,
            steps: generation_params.steps,
            denoise: generation_params.denoising_strength
          })
        )
      )
      |> add_node(
        node("noise", "RandomNoise", %{
          noise_seed: generation_params.seed,
          control_after_generate: "fixed"
        })
      )
      |> add_node(
        node("sampler", "KSamplerSelect", %{
          sampler_name: generation_params.sampler_name
        })
      )
      |> add_image_loader(
        name: "image_input",
        base64_image:
          String.replace(
            List.first(generation_params.init_images),
            ~r/data:image\S+;base64,/i,
            ""
          )
      )
      |> add_upscale_model_loader(generation_params.hr_upscaler, "upscaler")
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
          ),
        add: generation_params.hr_upscaler != "Latent"
      )
      |> then(
        &maybe_add_image_scale(
          &1,
          generation_params,
          "scaler",
          generation_params.hr_scale != 1 or
            (generation_params.hr_upscaler != "None" && generation_params.hr_upscaler != "Latent"),
          image:
            if(generation_params.hr_upscaler == "None" or generation_params.hr_scale < 1,
              do: node_ref("image_input", 0),
              else: get_lookup_value(&1, "upscale_with_model", "IMAGE")
            ),
          width: generation_params.width,
          height: generation_params.height
        )
      )
      |> then(
        &maybe_add_ultimate_upscale(
          &1,
          generation_params,
          attrs,
          nil,
          add_condition: has_ultimate_upscale,
          upscaled_image: get_lookup_value(&1, "scaler", "IMAGE")
        )
      )
      |> add_mask_image_loader(
        name: "mask",
        base64_image:
          String.replace(
            generation_params.mask,
            ~r/data:image\S+;base64,/i,
            ""
          )
      )
      |> add_node(
        node("negative_prompt", "ConditioningZeroOut", %{
          conditioning: node_ref("flux_guidance", 0)
        })
      )
      |> then(
        &add_img2img_vae_encode(&1,
          pixels: get_lookup_value(&1, "scaler", "IMAGE"),
          vae: node_ref("vae", 0),
          name: "img2img_vae_encode",
          batch_size: generation_params.batch_size,
          positive:
            node_ref(
              "flux_guidance",
              0
            ),
          negative:
            node_ref(
              "negative_prompt",
              0
            ),
          mask:
            node_ref(
              "mask",
              0
            )
        )
      )
      |> then(
        &maybe_add_latent_scale(
          &1,
          generation_params,
          "latent_upscaler",
          not has_ultimate_upscale and generation_params.hr_upscaler == "Latent" and
            attrs["scale"] > 1,
          samples:
            get_lookup_value(
              &1,
              "img2img_vae_encode",
              "latent_samples"
            )
        )
      )
      |> then(
        &add_node(
          &1,
          node("sampler_advanced", "SamplerCustomAdvanced", %{
            noise: node_ref("noise", 0),
            sampler: node_ref("sampler", 0),
            guider: node_ref("cfg_guider", 0),
            sigmas: node_ref("basic_scheduler", 0),
            latent_image:
              if(
                not has_ultimate_upscale and generation_params.hr_upscaler == "Latent" and
                  attrs["scale"] > 1,
                do: ["latent_upscaler", 0],
                else: get_lookup_value(&1, "img2img_vae_encode", "latent_samples")
              )
          })
        )
      )
      |> add_vae_decode(
        node_ref("sampler_advanced", 1),
        node_ref("vae", 0),
        "first_pass_vae_decode"
      )
      |> maybe_flux_img2img_second_pass(generation_params, attrs, has_full_scale_pass,
        latent:
          node_ref(
            "sampler_advanced",
            1
          ),
        image: node_ref("first_pass_vae_decode", 0),
        positive_loras: positive_loras,
        is_skimmed_cfg_enabled: is_skimmed_cfg_enabled
      )
      |> add_vae_decode(
        if(
          has_full_scale_pass and not has_ultimate_upscale and
            generation_params.hr_scale < 1,
          do: node_ref("second_pass_sampler", 1),
          else: node_ref("sampler_advanced", 1)
        ),
        node_ref("vae", 0),
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
      |> then(
        &add_node(
          &1,
          node("save", "SaveImage", %{
            "filename_prefix" => "A8R8",
            "images" =>
              node_ref(
                if(
                  has_ultimate_upscale,
                  do: "ultimate_upscale",
                  else: "vae_decode"
                ),
                0
              )
          })
        )
      )

    # File.write!("./prompt.json", Jason.encode!(prompt, pretty: true))

    prompt
  end

  @spec maybe_flux_img2img_second_pass(prompt(), GenerationParams.t(), map(), boolean, [
          {:add, boolean()}
          | {:latent, node_value()}
          | {:image, node_value()}
          | {:positive_loras, list()}
          | {:is_skimmed_cfg_enabled, boolean}
        ]) :: prompt()
  def maybe_flux_img2img_second_pass(prompt, generation_params, attrs, add, options \\ [])

  def maybe_flux_img2img_second_pass(
        prompt,
        _generation_params,
        _attrs,
        false = _add,
        _options
      ) do
    prompt
  end

  def maybe_flux_img2img_second_pass(prompt, generation_params, attrs, _add, options) do
    full_scale_pass = Map.get(attrs, "full_scale_pass", false)
    has_full_scale_pass = full_scale_pass and attrs["scale"] < 1

    first_pass_latent_ref = Keyword.get(options, :latent)
    first_pass_image_ref = Keyword.get(options, :image)

    positive_loras = Keyword.get(options, :positive_loras, [])
    is_skimmed_cfg_enabled = Keyword.get(options, :positive_loras, false)

    prompt
    |> add_image_upscale_with_model("fullscale_upscale_with_model",
      upscale_model:
        node_ref(
          "upscaler",
          0
        ),
      image: first_pass_image_ref
    )
    |> maybe_add_image_scale(
      generation_params,
      "second_pass_scaler",
      true,
      image:
        if(!has_full_scale_pass or generation_params.hr_upscaler == "None",
          do: first_pass_image_ref,
          else: node_ref("fullscale_upscale_with_model", 0)
        )
    )
    |> add_img2img_vae_encode(
      name: "second_pass_vae_encode",
      pixels:
        node_ref(
          "second_pass_scaler",
          0
        ),
      vae: get_vae(attrs),
      batch_size: generation_params.batch_size,
      positive:
        node_ref(
          "flux_guidance",
          0
        ),
      negative:
        node_ref(
          "negative_prompt",
          0
        ),
      mask:
        node_ref(
          "mask",
          0
        )
    )
    |> maybe_add_latent_scale(
      generation_params,
      "second_pass_latent_upscaler",
      generation_params.hr_upscaler == "Latent",
      samples: first_pass_latent_ref
    )
    # |> add_node(
    #   node("second_pass_inpaint_model_conditioning", "InpaintModelConditioning", %{
    #     positive:
    #       node_ref(
    #         "flux_guidance",
    #         0
    #       ),
    #     negative:
    #       node_ref(
    #         "negative_prompt",
    #         0
    #       ),
    #     vae: get_vae(attrs),
    #     pixels:
    #       node_ref(
    #         "second_pass_scaler",
    #         0
    #       ),
    #     mask:
    #       node_ref(
    #         "mask",
    #         0
    #       )
    #   })
    # )
    |> add_node(
      node("second_pass_noise", "RandomNoise", %{
        noise_seed: generation_params.seed,
        control_after_generate: "fixed"
      })
    )
    |> add_node(
      node("second_pass_basic_scheduler", "BasicScheduler", %{
        model:
          if(Enum.empty?(positive_loras),
            do:
              if(is_skimmed_cfg_enabled,
                do: node_ref("skimmed_cfg", 0),
                else: node_ref("differential_diffusion", 0)
              ),
            else: node_ref("positive_lora#{length(positive_loras) - 1}", 0)
          ),
        scheduler: generation_params.scheduler,
        steps: generation_params.steps,
        denoise: generation_params.sp_denoising_strength
      })
    )
    |> then(
      &add_node(
        &1,
        node(
          "second_pass_sampler",
          "SamplerCustomAdvanced",
          %{
            noise: node_ref("second_pass_noise", 0),
            sampler: node_ref("sampler", 0),
            guider: node_ref("cfg_guider", 0),
            sigmas: node_ref("second_pass_basic_scheduler", 0),
            latent_image:
              if(generation_params.hr_upscaler == "Latent",
                do: node_ref("second_pass_latent_upscaler", 0),
                else:
                  get_lookup_value(
                    &1,
                    "second_pass_vae_encode",
                    "latent_samples"
                  )
              )
          }
        )
      )
    )
  end

  @spec add_node_input(map(), atom() | binary(), node_value()) :: comfy_node()
  def add_node_input(node, input_name, value) do
    node_name = node_name(node)

    node
    |> put_in(
      [node_name, :inputs],
      Map.put(node[node_name].inputs, input_name, value)
    )
  end

  @spec add_node_output(comfy_node(), binary(), ref_node_value()) :: comfy_node()
  def add_node_output(node, output_name, node_ref) do
    node_name = node_name(node)

    node
    |> put_in(
      [node_name, :outputs],
      Map.put(node[node_name].outputs, output_name, node_ref)
    )
  end

  @spec remove_node_outputs(map()) :: comfy_node()
  def remove_node_outputs(node) do
    node_name = node_name(node)

    node
    |> Map.put(node_name, Map.delete(node[node_name], :outputs))
  end

  @spec add_node(prompt(), comfy_node(), boolean()) :: prompt()
  def add_node(prompt, node, add \\ true)

  def add_node(prompt, node, true = _add) do
    prompt
    |> put_in([:prompt], Map.merge(prompt.prompt, node |> remove_node_outputs()))
    |> add_lookup(node_name(node), Map.get(node[node_name(node)], :outputs, %{}))
  end

  def add_node(prompt, _node, false = _add) do
    prompt
  end

  @spec add_lookup(prompt(), binary(), map()) :: prompt()
  def add_lookup(prompt, key, value) do
    updated_lookup = prompt.lookup |> Map.put(key, value)
    prompt |> Map.put(:lookup, updated_lookup)
  end

  @spec get_lookup(prompt()) :: map()
  def get_lookup(prompt) do
    prompt |> Map.get(:lookup)
  end

  @spec get_lookup_value(prompt(), binary(), binary()) :: ref_node_value()
  def get_lookup_value(prompt, node_name, output_name) do
    prompt
    |> get_lookup()
    |> Map.get(node_name, %{})
    |> Map.get(output_name)
  end

  @spec node_name(map()) :: binary()
  def node_name(node) do
    List.first(Map.keys(node))
  end

  @spec add_vae_loader(prompt(), binary(), binary()) :: prompt()
  def add_vae_loader(prompt, vae_name, name \\ "vae") do
    node =
      node(name, "VAELoader")
      |> add_node_input("vae_name", vae_name)
      |> add_node_output("VAE", node_ref(name, 0))

    prompt
    |> add_node(node)
  end

  @spec add_vae_decode(prompt(), ref_node_value(), ref_node_value(), binary()) :: prompt()
  def add_vae_decode(prompt, samples, vae, name \\ "vae_decode") do
    node =
      node(name, "VAEDecode")
      |> add_node_input(:samples, samples)
      |> add_node_input(:vae, vae)
      |> add_node_output("IMAGE", node_ref(name, 0))

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
      |> add_node_output("LATENT", node_ref(name, 0))

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
      node("#{name}_latent_batch", "RepeatLatentBatch")
      |> add_node_input("amount", Keyword.get(options, :batch_size, 1))
      |> add_node_input("samples", node_ref(node_name, 3))

    prompt
    |> add_lookup(name, %{
      "positive" => node_ref(node_name, 0),
      "negative" => node_ref(node_name, 1),
      "latent_inpaint" => node_ref(node_name, 2),
      "latent_samples" => node_ref("#{name}_latent_batch", 0)
    })
    |> add_node(node)
    |> add_node(latent_batch_node)
  end

  @spec add_model_loader(prompt(), binary(), [
          {:name, binary()}
          | {:clip_skip, non_neg_integer()}
          | {:attrs, map()}
          | {:type, :flux | :sd3}
        ]) :: prompt()
  def add_model_loader(prompt, model_name, options \\ []) do
    name = Keyword.get(options, :name, "model")
    attrs = Keyword.get(options, :attrs, %{})
    type = Keyword.get(options, :type, :sd3)

    is_gguf = String.contains?(model_name, "gguf")

    node =
      if(is_gguf,
        do:
          node("model", "UnetLoaderGGUF", %{
            unet_name: model_name
          }),
        else:
          node(name, "CheckpointLoaderSimple", %{
            ckpt_name: model_name
          })
      )

    clip_models = Map.get(attrs, "clip_models", [])

    clip_name_1 = Enum.at(clip_models, 0)
    clip_name_2 = Enum.at(clip_models, 1)
    clip_name_3 = Enum.at(clip_models, 2)

    clip_loader =
      if(length(clip_models) == 2,
        do:
          node("clip", "DualCLIPLoaderGGUF", %{
            clip_name1: clip_name_1,
            clip_name2: clip_name_2,
            type: type
          }),
        else:
          node("clip", "TripleCLIPLoaderGGUF", %{
            clip_name1: clip_name_1,
            clip_name2: clip_name_2,
            clip_name3: clip_name_3,
            type: type
          })
      )
      |> add_node_output("CLIP", node_ref("clip", 0))

    # override_clip =
    #   node("clip", "OverrideCLIPDevice", %{
    #     clip: node_ref("clip_loader", 0),
    #     device: "cpu"
    #   })
    #   |> add_node_output("CLIP", node_ref("clip", 0))

    clip_skip_node =
      node("clip", "CLIPSetLastLayer", %{
        clip: node_ref(name, 1),
        stop_at_clip_layer: -Keyword.get(options, :clip_skip, 1)
      })
      |> add_node_output("CLIP", node_ref("clip", 0))

    # tea_cache_compile =
    #   node("model", "CompileModel", %{
    #     model: node_ref("tea_cache", 0),
    #     mode: "default",
    #     backend: "aot_eager",
    #     fullgraph: false,
    #     dynamic: false
    #   })

    prompt
    |> add_node(node)
    |> add_node(clip_loader, is_gguf)
    # |> add_node(override_clip, is_gguf)
    |> add_node(clip_skip_node, !is_gguf)
  end

  @spec add_clip_text_encode(prompt(), ref_node_value(), binary(), binary()) :: prompt()
  def add_clip_text_encode(prompt, clip, text, name \\ "prompt") do
    node =
      node(name, "CLIPTextEncode", %{clip: clip, text: text})
      |> add_node_output("CONDITIONING", node_ref(name, 0))

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
    name = Keyword.get(options, :name, "empty_latent_image")

    node =
      node(name, "EmptyLatentImage", %{
        batch_size: Keyword.get(options, :batch_size, 1),
        width: Keyword.get(options, :width),
        height: Keyword.get(options, :height)
      })
      |> add_node_output("LATENT", node_ref(name, 0))

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
        # node_ref("rescale_cfg", 0),
        model: Keyword.get(options, :model),
        positive: Keyword.get(options, :positive),
        negative: Keyword.get(options, :negative),
        sampler_name: Keyword.get(options, :sampler_name),
        scheduler: Keyword.get(options, :scheduler),
        seed: Keyword.get(options, :seed),
        steps: Keyword.get(options, :steps)
      })
      |> add_node_output("LATENT", node_ref(name, 0))

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
    name = Keyword.get(options, :name)

    node =
      node(name, "LoraLoader", %{
        model: Keyword.get(options, :model),
        clip: Keyword.get(options, :clip),
        lora_name: Keyword.get(options, :lora_name),
        strength_model: Keyword.get(options, :strength_model),
        strength_clip: Keyword.get(options, :strength_clip)
      })
      |> add_node_output("MODEL", node_ref(name, 0))
      |> add_node_output("CLIP", node_ref(name, 1))

    prompt
    |> add_node(node)
  end

  @spec add_loras(prompt(), map(), [
          {:is_txt2img, boolean()}
          | {:model, ref_node_value()}
          | {:clip, ref_node_value()}
        ]) ::
          prompt()
  def add_loras(
        prompt,
        %{"positive_loras" => positive_loras} = attrs,
        options \\ []
      ) do
    is_txt2img = Keyword.get(options, :is_txt2img)
    fooocus_inpaint = Map.get(attrs, "fooocus_inpaint", false)

    model =
      Keyword.get(
        options,
        :model,
        if(not is_txt2img and fooocus_inpaint,
          do: node_ref("apply_fooocus_inpaint", 0),
          else: get_base_model(Keyword.get(options, :is_txt2img))
        )
      )

    clip =
      Keyword.get(
        options,
        :clip,
        get_lookup_value(prompt, "clip", "CLIP")
      )

    updated_prompt =
      positive_loras
      |> Enum.with_index()
      |> Enum.reduce(prompt, fn {%{name: name, value: value}, index}, acc_prompt ->
        acc_prompt
        |> add_lora(
          name: "positive_lora#{index}",
          model:
            if(index > 0,
              do: node_ref("positive_lora#{index - 1}", 0),
              else: model
            ),
          clip:
            if(index > 0,
              do:
                node_ref(
                  "positive_lora#{index - 1}",
                  1
                ),
              else: clip
            ),
          lora_name: "#{name}.safetensors",
          strength_model: value,
          strength_clip: value
        )
      end)

    updated_prompt =
      if Enum.empty?(positive_loras) do
        updated_prompt
        |> add_lookup("loras", %{
          "MODEL" => model,
          "CLIP" => get_lookup_value(updated_prompt, "clip", "CLIP")
        })
      else
        updated_prompt
        |> add_lookup("loras", %{
          "MODEL" =>
            get_lookup_value(updated_prompt, get_last_lora_node_name(positive_loras), "MODEL"),
          "CLIP" =>
            get_lookup_value(updated_prompt, get_last_lora_node_name(positive_loras), "CLIP")
        })
      end

    updated_prompt
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
  @spec maybe_add_controlnet(prompt(), list(), GenerationParams.t(), map(), [
          {:positive, ref_node_value()} | {:negative, ref_node_value()}
        ]) :: prompt()
  def maybe_add_controlnet(
        prompt,
        controlnet_args,
        %GenerationParams{} = generation_params,
        _attrs,
        options \\ []
      ) do
    controlnet_args = controlnet_args || []
    positive = Keyword.get(options, :positive)
    negative = Keyword.get(options, :negative)

    active_layers = length(controlnet_args)

    if Enum.empty?(controlnet_args) do
      prompt
      |> add_lookup("controlnets", %{"positive" => positive, "negative" => negative})
    else
      updated_prompt =
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

      last_cn_node_name = get_last_cn_node_name(controlnet_args)

      updated_prompt
      |> add_lookup("controlnets", %{
        "positive" => node_ref(last_cn_node_name, 0),
        "negative" => node_ref(last_cn_node_name, 1)
      })
    end
  end

  @spec maybe_add_regional_prompts_with_conditioning(prompt(), map(), [
          {:clip, ref_node_value()} | {:global_prompt, ref_node_value()} | {:name, binary()}
        ]) ::
          prompt()
  @spec maybe_add_regional_prompts_with_conditioning(
          %{
            lookup: map(),
            prompt: %{optional(binary()) => %{class_type: binary(), inputs: map()}}
          },
          map()
        ) :: %{
          lookup: map(),
          prompt: %{optional(binary()) => %{class_type: binary(), inputs: map()}}
        }
  def maybe_add_regional_prompts_with_conditioning(prompt, attrs, options \\ []) do
    is_regional_prompting_enabled = Map.get(attrs, "is_regional_prompting_enabled", false)
    regional_prompts = Map.get(attrs, "regional_prompts")
    global_prompt_weight = Map.get(attrs, "global_prompt_weight", 0.3)

    if is_regional_prompting_enabled && regional_prompts && not Enum.empty?(regional_prompts) do
      regional_prompts_count = length(regional_prompts)
      positive_loras = Map.get(attrs, "positive_loras")
      # TODO: add regional conditioning and combine
      clip = Keyword.get(options, :clip, node_ref("clip", 0))

      {new_prompt, last_node_name} =
        Enum.reduce(
          Enum.with_index(regional_prompts),
          {prompt, ""},
          fn {regional_prompt, index}, {acc_prompt, last_node_name} ->
            id = Map.get(regional_prompt, "id")
            prompt = Map.get(regional_prompt, "prompt")
            weight = Map.get(regional_prompt, "weight")
            region_blend = 1 - Map.get(regional_prompt, "region_blend", 0.6)
            mask_image = Map.get(regional_prompt, "mask")

            new_prompt =
              acc_prompt
              |> add_clip_text_encode(
                clip,
                prompt,
                "prompt_region_#{id}_text"
              )
              |> add_conditioning_mask(
                conditioning_prompt: node_ref("prompt_region_#{id}_text", 0),
                mask_image: mask_image,
                weight: weight,
                name: "prompt_region_#{id}"
              )
              |> add_node(
                node(
                  "prompt_region_#{id}_conditioning_set_timestep_range",
                  "ConditioningSetTimestepRange",
                  %{
                    "conditioning" => node_ref("prompt_region_#{id}", 0),
                    "start" => region_blend,
                    "end" => 1
                  }
                )
              )
              |> add_conditioning_mask(
                conditioning_prompt: node_ref("prompt_region_#{id}_text", 0),
                mask_ref: node_ref("prompt_region_#{id}_mask_with_blur", 0),
                weight: weight,
                set_cond_area: "mask bounds",
                name: "prompt_region_#{id}_cond_mask"
              )
              |> add_node(
                node(
                  "prompt_region_#{id}_cond_mask_conditioning_set_timestep_range",
                  "ConditioningSetTimestepRange",
                  %{
                    "conditioning" => node_ref("prompt_region_#{id}_cond_mask", 0),
                    "start" => 0,
                    "end" => region_blend
                  }
                )
              )
              |> add_conditioning_combine(
                node_ref("prompt_region_#{id}_conditioning_set_timestep_range", 0),
                node_ref("prompt_region_#{id}_cond_mask_conditioning_set_timestep_range", 0),
                name: "prompt_region_#{id}_cond_mask_comb"
              )

            {new_prompt, last_node_name} =
              if regional_prompts_count > 1 and index > 0 do
                node_1_name = last_node_name
                node_2_name = "prompt_region_#{id}_cond_mask_comb"

                last_node_name = "regional_prompt_combine_#{id}_#{node_1_name}"

                {new_prompt
                 |> add_conditioning_combine(
                   node_ref(node_1_name, 0),
                   node_ref(node_2_name, 0),
                   name: "#{last_node_name}"
                 ), last_node_name}
              else
                {new_prompt, "prompt_region_#{id}_cond_mask_comb"}
              end

            {new_prompt, last_node_name}
          end
        )

      new_prompt
      |> add_conditioning_area_strength(
        Keyword.get(options, :global_prompt, node_ref("positive_prompt", 0)),
        global_prompt_weight,
        "regional_prompt_global_effect"
      )
      |> add_conditioning_combine(
        node_ref("regional_prompt_global_effect", 0),
        node_ref(last_node_name, 0),
        name: Keyword.get(options, :name, "regional_prompt")
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
          | {:clip, ref_node_value()}
          | {:model, ref_node_value()}
        ]) :: prompt()
  def maybe_add_regional_prompts_with_coupling(prompt, attrs, options \\ []) do
    is_regional_prompting_enabled = Map.get(attrs, "is_regional_prompting_enabled", false)
    regional_prompts = Map.get(attrs, "regional_prompts")
    global_prompt_weight = Map.get(attrs, "global_prompt_weight", 0.3)
    model = Keyword.get(options, :model)

    if is_regional_prompting_enabled && regional_prompts && not Enum.empty?(regional_prompts) do
      # positive_loras = Map.get(attrs, "positive_loras")
      # ip_adapters = Map.get(attrs, "ip_adapters", [])
      # fooocus_inpaint = Map.get(attrs, "fooocus_inpaint", false)

      clip = Keyword.get(options, :clip)

      {new_prompt, attention_couple_regions} =
        Enum.reduce(
          regional_prompts,
          {prompt, []},
          fn regional_prompt, {acc_prompt, acc_attention_couple_regions} ->
            id = Map.get(regional_prompt, "id")
            prompt = Map.get(regional_prompt, "prompt")
            weight = Map.get(regional_prompt, "weight")
            mask = Map.get(regional_prompt, "mask")
            mask |> ExSd.Sd.ImageService.save("attention couple #{id}")

            new_prompt =
              acc_prompt
              |> add_clip_text_encode(
                clip,
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
            model: model,
            # if(Enum.empty?(ip_adapters),
            #   do:
            #     if(Enum.empty?(positive_loras),
            #       do:
            #         if(fooocus_inpaint,
            #           do: node_ref("apply_fooocus_inpaint", 0),
            #           else: get_base_model(Keyword.get(options, :is_txt2img, true))
            #         ),
            #       else: node_ref("positive_lora#{length(positive_loras) - 1}", 0)
            #     ),
            #   else: node_ref("ip_adapter_#{length(ip_adapters) - 1}", 0)
            # ),
            base_prompt: Keyword.get(options, :base_prompt, node_ref("positive_prompt", 0)),
            width: Keyword.get(options, :width),
            height: Keyword.get(options, :height),
            regions:
              node_ref(
                "attention_couple_regions_#{max(0, ceil(length(attention_couple_regions) / 10) - 1)}",
                0
              )
          }
        )
      )
      |> add_lookup("regional_prompting", %{"MODEL" => node_ref("attention_couple", 0)})
    else
      prompt |> add_lookup("regional_prompting", %{"MODEL" => model})
    end
  end

  @spec add_output(prompt(), ref_node_value(), binary()) :: prompt()
  def add_output(prompt, images, name \\ "output") do
    # "Base64ImageOutput")
    node =
      node(name, "SaveImageWebsocket")
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
          [
            {:name, binary()}
            | {:conditioning_prompt, ref_node_value()}
            | {:weight, non_neg_integer()}
            | {:mask_image, binary()}
            | {:mask_ref, ref_node_value()}
            | {:set_cond_area, :default | :"mask bounds"}
          ]
        ) :: prompt()
  def add_conditioning_mask(prompt, options \\ []) do
    name = Keyword.get(options, :name)
    conditioning_prompt = Keyword.get(options, :conditioning_prompt)
    mask_image = Keyword.get(options, :mask_image)
    mask_ref = Keyword.get(options, :mask_ref)
    weight = Keyword.get(options, :weight)
    set_cond_area = Keyword.get(options, :set_cond_area, "default")

    prompt =
      if mask_ref do
        prompt
      else
        convert_image_to_mask_node =
          image_to_mask_node("#{name}_convert_image_mask", node_ref("#{name}_mask", 0))

        mask_blur_node =
          node("#{name}_mask_with_blur", "MaskBlur+")
          |> add_node_input(:mask, node_ref("#{name}_convert_image_mask", 0))
          |> add_node_input(:amount, 100)
          |> add_node_input(:device, "auto")

        prompt
        |> add_node(convert_image_to_mask_node)
        |> add_node(mask_blur_node)
        |> add_image_loader(base64_image: mask_image, name: "#{name}_mask")
      end

    node =
      node(name, "ConditioningSetMask")
      |> add_node_input(:conditioning, conditioning_prompt)
      |> add_node_input(
        :mask,
        if(mask_ref, do: mask_ref, else: node_ref("#{name}_mask_with_blur", 0))
      )
      |> add_node_input(:strength, weight)
      # "mask bounds"
      |> add_node_input(:set_cond_area, set_cond_area)

    prompt |> add_node(node)
  end

  @spec image_to_mask_node(binary(), ref_node_value()) :: comfy_node()
  def image_to_mask_node(name, image) do
    node(name, "ImageToMask", %{channel: "red", image: image})
  end

  @spec add_conditioning_combine(prompt(), ref_node_value(), ref_node_value(), [{:name, binary()}]) ::
          prompt()
  def add_conditioning_combine(prompt, conditioning_1, conditioning_2, options \\ []) do
    name = Keyword.get(options, :name)

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
          {:model, ref_node_value()}
          | {:positive_loras, list()}
          | {:controlnet_args, list()}
          | {:attrs, map()}
          | {:first_pass_samples, ref_node_value()}
          | {:positive_prompt, ref_node_value()}
          | {:negative_prompt, ref_node_value()}
        ]) ::
          prompt()
  def maybe_add_scale(
        prompt,
        %GenerationParams{} = generation_params,
        add_condition \\ true,
        options \\ []
      ) do
    if(add_condition) do
      attrs = Keyword.get(options, :attrs)
      positive_loras = Keyword.get(options, :positive_loras)
      controlnet_args = Keyword.get(options, :controlnet_args, [])
      ip_adapters = Map.get(attrs, "ip_adapters", [])
      is_skimmed_cfg_enabled = get_in(attrs, ["skimmed_cfg", "is_enabled"]) || false
      is_sd_35 = Regex.match?(~r/3\.?5/i, attrs["model"])

      model =
        Keyword.get(options, :model, get_lookup_value(prompt, "regional_prompting", "MODEL"))

      first_pass_samples_ref =
        Keyword.get(
          options,
          :first_pass_samples,
          get_lookup_value(prompt, "sampler", "LATENT")
        )

      positive_prompt_ref =
        Keyword.get(
          options,
          :positive_prompt,
          get_lookup_value(prompt, "controlnets", "positive")
        )

      negative_prompt_ref =
        Keyword.get(
          options,
          :negative_prompt,
          get_lookup_value(prompt, "controlnets", "negative")
        )

      is_regional_prompting_enabled = Map.get(attrs, "is_regional_prompting_enabled", false)

      prompt
      |> maybe_add_latent_scale(
        generation_params,
        "hires_latent_scaler",
        generation_params.hr_upscaler == "Latent",
        samples: first_pass_samples_ref
      )
      |> add_vae_decode(first_pass_samples_ref, get_vae(attrs), "first_pass_vae_decode")
      |> maybe_add_image_scale(generation_params, "scaler", true,
        image:
          node_ref(
            if(generation_params.hr_upscaler == "None" or generation_params.hr_scale < 1,
              do: "first_pass_vae_decode",
              else: "upscale_with_model"
            ),
            0
          )
      )
      |> add_upscale_model_loader(generation_params.hr_upscaler, "upscaler")
      |> then(
        &add_image_upscale_with_model(&1, "upscale_with_model",
          upscale_model:
            get_lookup_value(
              &1,
              "upscaler",
              "UPSCALE_MODEL"
            ),
          image: get_lookup_value(&1, "first_pass_vae_decode", "IMAGE")
        )
      )
      |> then(
        &add_vae_encode(
          &1,
          get_lookup_value(&1, "scaler", "IMAGE"),
          get_vae(attrs),
          "second_pass_vae_encode"
        )
      )
      |> then(
        &add_k_sampler(
          &1,
          "hires_sampler",
          cfg: generation_params.cfg_scale,
          denoise: generation_params.sp_denoising_strength,
          latent_image:
            if(generation_params.hr_upscaler == "Latent",
              do: get_lookup_value(&1, "hires_latent_scaler", "LATENT"),
              else: get_lookup_value(&1, "second_pass_vae_encode", "LATENT")
            ),
          model: model,
          # Keyword.get(
          #   options,
          #   :model,
          #   if(Enum.empty?(positive_loras),
          #     do:
          #       if(is_regional_prompting_enabled && !is_sd_35,
          #         do: get_lookup_value(&1, "regional_prompting", "MODEL"),
          #         else:
          #           if(Enum.empty?(ip_adapters),
          #             do:
          #               if(is_skimmed_cfg_enabled,
          #                 do: node_ref("skimmed_cfg", 0),
          #                 else: get_base_model(generation_params.txt2img)
          #               ),
          #             else:
          #               get_lookup_value(
          #                 &1,
          #                 get_last_ip_adapter_node_name(ip_adapters),
          #                 "MODEL"
          #               )
          #           )
          #       ),
          #     else:
          #       if(is_regional_prompting_enabled && !is_sd_35,
          #         do: get_lookup_value(&1, "regional_prompting", "MODEL"),
          #         else:
          #           if(Enum.empty?(ip_adapters),
          #             do:
          #               if(is_skimmed_cfg_enabled,
          #                 do: node_ref("skimmed_cfg", 0),
          #                 else: node_ref("positive_lora#{length(positive_loras) - 1}", 0)
          #               ),
          #             else:
          #               get_lookup_value(
          #                 &1,
          #                 get_last_ip_adapter_node_name(ip_adapters),
          #                 "MODEL"
          #               )
          #           )
          #       )
          #   )
          # ),
          positive: positive_prompt_ref,
          # if(is_nil(controlnet_args) or Enum.empty?(controlnet_args),
          #   do:
          #     if(is_regional_prompting_enabled && is_sd_35,
          #       do:
          #         node_ref(
          #           "regional_prompt",
          #           0
          #         ),
          #       else: positive_prompt_ref
          #     ),
          #   else:
          #     node_ref(
          #       "cn#{length(controlnet_args) - 1}_apply_controlnet",
          #       0
          #     )
          # ),
          negative: negative_prompt_ref,
          # if(is_nil(controlnet_args) or Enum.empty?(controlnet_args),
          #   do: negative_prompt_ref,
          #   else:
          #     node_ref(
          #       "cn#{length(controlnet_args) - 1}_apply_controlnet",
          #       1
          #     )
          # ),
          sampler_name: generation_params.sampler_name,
          scheduler: attrs["scheduler"] || "karras",
          seed: generation_params.seed,
          steps: generation_params.steps
        )
      )
    else
      prompt
    end
  end

  @spec maybe_add_latent_scale(
          prompt(),
          GenerationParams.t(),
          binary(),
          boolean(),
          [
            {:samples, ref_node_value()}
            | {:width, non_neg_integer()}
            | {:height, non_neg_integer()}
          ]
        ) ::
          prompt()
  def maybe_add_latent_scale(prompt, generation_params, name, add_condition, options \\ [])

  def maybe_add_latent_scale(
        prompt,
        %GenerationParams{} = generation_params,
        name,
        true = _add_condition,
        options
      ) do
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
                else:
                  generation_params.width *
                    if(generation_params.txt2img, do: generation_params.hr_scale, else: 1)
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
                else:
                  generation_params.height *
                    if(generation_params.txt2img, do: generation_params.hr_scale, else: 1)
              )
            )
          ),
        crop: "disabled"
      })
      |> add_node_output("LATENT", node_ref(name, 0))

    prompt
    |> add_node(node)
  end

  def maybe_add_latent_scale(
        prompt,
        _generation_params,
        _name,
        _add_condition,
        _options
      ) do
    prompt
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
      |> add_node_output("MODEL", node_ref(name, 0))

    prompt
    |> add_node(node)
  end

  @spec maybe_add_ip_adapters(prompt(), map(), [{:model, ref_node_value()}]) :: prompt()
  def maybe_add_ip_adapters(prompt, attrs, options \\ []) do
    ip_adapters = Map.get(attrs, "ip_adapters", [])

    model = Keyword.get(options, :model)

    if Enum.empty?(ip_adapters) do
      prompt
      |> add_lookup("ip_adapters", %{
        "MODEL" => model
      })
    else
      updated_prompt =
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

      updated_prompt
      |> add_lookup("ip_adapters", %{
        "MODEL" =>
          get_lookup_value(updated_prompt, get_last_ip_adapter_node_name(ip_adapters), "MODEL")
      })
    end
  end

  @spec maybe_add_image_scale(prompt(), GenerationParams.t(), binary(), boolean(), [
          {:image, ref_node_value()},
          {:width, non_neg_integer()},
          {:height, non_neg_integer()}
        ]) ::
          prompt()
  def maybe_add_image_scale(
        prompt,
        generation_params,
        name,
        add_condition,
        options \\ []
      )

  def maybe_add_image_scale(
        prompt,
        %GenerationParams{} = generation_params,
        name,
        true = _add_condition,
        options
      ) do
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
      |> add_node_output("IMAGE", node_ref(name, 0))

    prompt
    |> add_node(node)
  end

  def maybe_add_image_scale(
        prompt,
        _generation_params,
        name,
        _add_condition,
        options
      ) do
    prompt
    |> add_lookup(name, %{"IMAGE" => Keyword.get(options, :image)})
  end

  @spec add_image_upscale_with_model(prompt(), binary(), [
          {:upscale_model, ref_node_value()} | {:image, ref_node_value()} | {:add, boolean}
        ]) :: prompt()
  def add_image_upscale_with_model(prompt, name, options \\ []) do
    add = Keyword.get(options, :add, true)
    image = Keyword.get(options, :image)

    if add do
      node =
        node(name, "ImageUpscaleWithModel", %{
          upscale_model: Keyword.get(options, :upscale_model),
          image: image
        })
        |> add_node_output("IMAGE", node_ref(name, 0))

      prompt
      |> add_node(node)
    else
      prompt |> add_lookup(name, %{"IMAGE" => image})
    end
  end

  @spec add_upscale_model_loader(prompt(), binary(), binary()) :: none()
  def add_upscale_model_loader(prompt, model_name, name) do
    node =
      node(name, "UpscaleModelLoader", %{
        model_name: model_name
      })
      |> add_node_output("UPSCALE_MODEL", node_ref(name, 0))

    prompt
    |> add_node(node)
  end

  @spec maybe_add_ultimate_upscale(prompt(), GenerationParams.t(), map(), list(), [
          {:name, binary()}
          | {:add_condition, boolean()}
          | {:upscaled_image, ref_node_value()}
        ]) :: prompt()
  def maybe_add_ultimate_upscale(
        prompt,
        %GenerationParams{} = generation_params,
        attrs,
        controlnet_args,
        options \\ []
      ) do
    ultimate_upscale = Map.get(attrs, "ultimate_upscale", %{})

    add_condition = Keyword.get(options, :add_condition)

    if add_condition do
      is_sd_xl = sd_xl_model?(attrs)
      is_flux = flux_model?(attrs)
      is_pony = pony_model?(attrs)
      is_sd_35 = sd_35_model?(attrs)

      is_regional_prompting_enabled = Map.get(attrs, "is_regional_prompting_enabled", false)

      positive_loras = Map.get(attrs, "positive_loras")

      ip_adapters = Map.get(attrs, "ip_adapters", [])

      node =
        node(Keyword.get(options, :name, "ultimate_upscale"), "UltimateSDUpscaleNoUpscale", %{
          seed: generation_params.seed,
          steps: generation_params.steps,
          cfg: generation_params.cfg_scale,
          sampler_name: generation_params.sampler_name,
          scheduler: attrs["scheduler"] || "karras",
          denoise: generation_params.denoising_strength,
          mode_type: Map.get(ultimate_upscale, "mode_type"),
          tile_width:
            Map.get(
              ultimate_upscale,
              "tile_width",
              if(is_sd_xl || is_flux || is_pony || is_sd_35, do: 1024, else: 512)
            ),
          tile_height:
            Map.get(
              ultimate_upscale,
              "tile_width",
              if(is_sd_xl || is_flux || is_pony || is_sd_35, do: 1024, else: 512)
            ),
          mask_blur: Map.get(ultimate_upscale, "mask_blur"),
          tile_padding: Map.get(ultimate_upscale, "tile_padding"),
          tiled_decode: Map.get(ultimate_upscale, "tiled_decode"),
          seam_fix_mode: Map.get(ultimate_upscale, "seam_fix_mode"),
          seam_fix_denoise: Map.get(ultimate_upscale, "seam_fix_denoise"),
          seam_fix_width: Map.get(ultimate_upscale, "seam_fix_width"),
          seam_fix_mask_blur: Map.get(ultimate_upscale, "seam_fix_mask_blur"),
          seam_fix_padding: Map.get(ultimate_upscale, "seam_fix_padding"),
          force_uniform_tiles: Map.get(ultimate_upscale, "force_uniform_tiles"),
          upscaled_image:
            Keyword.get(
              options,
              :upscaled_image,
              node_ref(
                "scaler",
                0
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

  @spec maybe_add_tea_cache(prompt(), [{:model, ref_node_value()} | {:add, boolean()}]) ::
          prompt()
  def maybe_add_tea_cache(prompt, options \\ []) do
    name = "tea_cache"
    model = Keyword.get(options, :model)

    add = Keyword.get(options, :add, true)

    if add do
      tea_cache =
        node(name, "TeaCache", %{
          model: model,
          model_type: "flux",
          rel_l1_thresh: 0.4,
          max_skip_steps: 3
        })
        |> add_node_output("MODEL", node_ref(name, 0))

      prompt
      |> add_node(tea_cache)
    else
      prompt
      |> add_lookup(name, %{"MODEL" => model})
    end
  end

  @spec maybe_add_skimmed_cfg(prompt(), [
          {:name, binary()}
          | {:model, ref_node_value()}
          | {:skimming_cfg, non_neg_integer()}
          | {:full_skim_negative, boolean()}
          | {:disable_flipping_filter, boolean()}
          | {:add, boolean()}
        ]) :: prompt()
  def maybe_add_skimmed_cfg(prompt, options) do
    add = Keyword.get(options, :add, true)
    name = Keyword.get(options, :name, "skimmed_cfg")
    model = Keyword.get(options, :model)

    if add do
      prompt
      |> add_node(
        node(name, "Skimmed CFG", %{
          model: model,
          Skimming_CFG: Keyword.get(options, :skimming_cfg),
          full_skim_negative: Keyword.get(options, :full_skim_negative, false),
          disable_flipping_filter: Keyword.get(options, :disable_flipping_filter, false)
        })
        |> add_node_output("MODEL", node_ref(name, 0))
      )
    else
      prompt
      |> add_lookup(name, %{"MODEL" => model})
    end
  end

  @spec maybe_add_tiled_diffusion(prompt(), [
          {:name, binary()}
          | {:add, boolean()}
          | {:attrs, map()}
        ]) ::
          prompt()
  def maybe_add_tiled_diffusion(prompt, options \\ []) do
    name = Keyword.get(options, :name, "tiled_diffusion")
    model = Keyword.get(options, :model)
    add = Keyword.get(options, :add, true)
    attrs = Keyword.get(options, :attrs)
    tiled_diffusion = Map.get(attrs, "tiled_diffusion", %{})
    method = Map.get(tiled_diffusion, :method, "Mixture of Diffusers")
    tile_width = Map.get(tiled_diffusion, "tile_width")
    tile_height = Map.get(tiled_diffusion, "tile_height")
    tile_overlap = Map.get(tiled_diffusion, "tile_overlap")
    tile_batch_size = Map.get(tiled_diffusion, "tile_batch_size")

    if add do
      prompt
      |> add_node(
        node(name, "TiledDiffusion", %{
          model: model,
          method: method,
          tile_width: tile_width,
          tile_height: tile_height,
          tile_overlap: tile_overlap,
          tile_batch_size: tile_batch_size
        })
      )
      |> add_lookup(
        name,
        %{"MODEL" => node_ref(name, 0)}
      )
    else
      prompt
      |> add_lookup(
        name,
        %{"MODEL" => model}
      )
    end
  end

  @spec maybe_add_rescale_cfg(prompt(), [
          {:add, boolean()}
          | {:name, binary()}
          | {:model, ref_node_value()}
          | {:multiplier, float()}
        ]) ::
          prompt()
  def maybe_add_rescale_cfg(prompt, options \\ []) do
    add = Keyword.get(options, :add, true)
    model = Keyword.get(options, :model, true)
    multiplier = Keyword.get(options, :multiplier, true)
    name = Keyword.get(options, :name, "rescale_cfg")

    if add do
      prompt
      |> add_node(
        node(name, "RescaleCFG", %{
          model: model,
          multiplier: multiplier
        })
      )
      |> add_lookup(
        name,
        %{"MODEL" => node_ref(name, 0)}
      )
    else
      prompt
      |> add_lookup(
        name,
        %{"MODEL" => model}
      )
    end
  end

  @spec maybe_add_fooocus_inpaint(prompt(), [
          {:add, boolean}
          | {:name, binary()}
          | {:model, ref_node_value()}
          | {:latent, ref_node_value()}
        ]) :: prompt()
  def maybe_add_fooocus_inpaint(prompt, options \\ []) do
    name = Keyword.get(options, :name, "apply_fooocus_inpaint")
    add = Keyword.get(options, :add, true)
    model = Keyword.get(options, :model)
    latent = Keyword.get(options, :latent)

    if add do
      prompt
      |> add_node(
        node(name, "INPAINT_ApplyFooocusInpaint", %{
          model: model,
          patch: node_ref("load_fooocus_inpaint_patch", 0),
          latent: latent
        })
      )
      |> add_lookup(name, %{
        "MODEL" => node_ref(name, 0)
      })
    else
      prompt
      |> add_lookup(name, %{
        "MODEL" => model
      })
    end
  end

  @spec maybe_add_instant_id(prompt(), map(), [
          {:add, boolean()}
          | {:image, binary()}
          | {:model, ref_node_value()}
          | {:positive, binary()}
          | {:negative, binary()}
          | {:ip_weight, float()}
          | {:cn_strength, float()}
          | {:start_at, float()}
          | {:end_at, float()}
          | {:noise, float()}
          | {:combine_embeds, binary()}
          | {:image_kps, binary()}
          | {:mask, binary()}
          | {:name, binary()}
        ]) :: prompt()
  def maybe_add_instant_id(prompt, attrs, options \\ []) do
    name = Keyword.get(options, :add, "apply_instant_id_advanced")

    # image_data_url = Map.get(attrs, "instant_id_image")
    instant_ids = Map.get(attrs, "instant_ids", [])
    model = Keyword.get(options, :model)

    if Enum.empty?(instant_ids) do
      prompt
      |> add_lookup(
        name,
        %{
          "MODEL" => model,
          "positive" => get_lookup_value(prompt, "positive_prompt", "CONDITIONING"),
          "negative" => node_ref("negative_prompt", 0)
        }
      )
    else
      instant_id = List.first(instant_ids)
      image_data_url = instant_id["image"]
      image_kps_data_url = instant_id["image_kps"]

      mask_data_url = instant_id["mask"]

      load_instant_id_model =
        node("load_instant_id_model", "InstantIDModelLoader", %{
          instantid_file: "ip-adapter_instant_id_sdxl.bin"
        })

      instant_id_face_analysis =
        node("instant_id_face_analysis", "InstantIDFaceAnalysis", %{provider: "CPU"})

      controlnet_loader =
        node("controlnet_loader", "ControlNetLoader", %{
          control_net_name: "control_instant_id_sdxl.safetensors"
        })

      apply_instant_id_advanced =
        node(name, "ApplyInstantIDAdvanced", %{
          instantid: node_ref("load_instant_id_model", 0),
          insightface: node_ref("instant_id_face_analysis", 0),
          control_net: node_ref("controlnet_loader", 0),
          image: Keyword.get(options, :image, node_ref("instant_id_image_input", 0)),
          model: model,
          positive: Keyword.get(options, :positive),
          negative: Keyword.get(options, :negative),
          ip_weight: Map.get(instant_id, "ip_weight", 0.8),
          cn_strength: Map.get(instant_id, "weight", 0.8),
          start_at: Map.get(instant_id, "start_at", 0),
          end_at: Map.get(instant_id, "end_at", 1),
          noise: Map.get(instant_id, "noise", 0),
          combine_embeds: Keyword.get(options, :combine_embeds, "concat"),
          image_kps:
            if(image_kps_data_url,
              do: Keyword.get(options, :image_kps, node_ref("instant_id_image_kps", 0)),
              else: nil
            ),
          mask:
            if(mask_data_url,
              do: Keyword.get(options, :mask, node_ref("instant_id_mask", 0)),
              else: nil
            )
        })

      apply_instant_id_advanced =
        apply_instant_id_advanced
        |> add_node_output("MODEL", node_ref(name, 0))
        |> add_node_output("positive", node_ref(name, 1))
        |> add_node_output("negative", node_ref(name, 2))

      prompt =
        prompt
        |> add_image_loader(
          name: "instant_id_image_input",
          base64_image:
            String.replace(
              image_data_url,
              ~r/data:image\S+;base64,/i,
              ""
            )
        )

      prompt =
        if(image_kps_data_url,
          do:
            prompt
            |> add_image_loader(
              name: "instant_id_image_kps",
              base64_image:
                String.replace(
                  image_kps_data_url,
                  ~r/data:image\S+;base64,/i,
                  ""
                )
            ),
          else: prompt
        )

      prompt =
        if(mask_data_url,
          do:
            prompt
            |> add_mask_image_loader(
              name: "instant_id_mask",
              base64_image:
                String.replace(
                  mask_data_url,
                  ~r/data:image\S+;base64,/i,
                  ""
                )
            ),
          else: prompt
        )

      prompt
      |> add_node(load_instant_id_model)
      |> add_node(instant_id_face_analysis)
      |> add_node(controlnet_loader)
      |> add_node(apply_instant_id_advanced)
    end
  end

  @spec maybe_add_perturbed_attention_guidance(prompt(), [
          {:model, ref_node_value()}
          | {:name, binary()}
          | {:attrs, map()}
          | {:add, boolean()}
        ]) :: prompt()
  def maybe_add_perturbed_attention_guidance(prompt, options \\ []) do
    name = Keyword.get(options, :name, "perturbed_attention_guidance")
    model = Keyword.get(options, :model)
    add = Keyword.get(options, :add, true)
    attrs = Keyword.get(options, :attrs, %{})

    perturbed_attention_guidance =
      Map.get(attrs, "perturbed_attention_guidance", %{})

    if add do
      node =
        node(name, "PerturbedAttention", %{
          model: model,
          scale: Map.get(perturbed_attention_guidance, "scale"),
          adaptive_scale: Map.get(perturbed_attention_guidance, "adaptive_scale"),
          sigma_start: Map.get(perturbed_attention_guidance, "sigma_start"),
          sigma_end: Map.get(perturbed_attention_guidance, "sigma_end"),
          rescale: Map.get(perturbed_attention_guidance, "rescale"),
          rescale_mode: Map.get(perturbed_attention_guidance, "rescale_mode"),
          unet_block: "middle",
          unet_block_id: 0
        })
        |> add_node_output("MODEL", node_ref(name, 0))

      prompt
      |> add_node(node)
    else
      prompt
      |> add_lookup(name, %{"MODEL" => model})
    end
  end

  @spec maybe_add_smoothed_energy_guidance(prompt(), [
          {:model, ref_node_value()}
          | {:name, binary()}
          | {:attrs, map()}
          | {:add, boolean()}
        ]) :: prompt()
  def maybe_add_smoothed_energy_guidance(prompt, options \\ []) do
    name = Keyword.get(options, :name, "smoothed_energy_guidance")
    model = Keyword.get(options, :model)
    add = Keyword.get(options, :add, true)
    attrs = Keyword.get(options, :attrs, %{})

    smoothed_energy_guidance =
      Map.get(attrs, "smoothed_energy_guidance", %{})

    if add do
      node =
        node(name, "SmoothedEnergyGuidanceAdvanced", %{
          model: model,
          scale: Map.get(smoothed_energy_guidance, "scale"),
          blur_sigma: Map.get(smoothed_energy_guidance, "blur_sigma"),
          sigma_start: Map.get(smoothed_energy_guidance, "sigma_start"),
          sigma_end: Map.get(smoothed_energy_guidance, "sigma_end"),
          rescale: Map.get(smoothed_energy_guidance, "rescale"),
          rescale_mode: Map.get(smoothed_energy_guidance, "rescale_mode"),
          unet_block: "middle",
          unet_block_id: 0
        })
        |> add_node_output("MODEL", node_ref(name, 0))

      prompt
      |> add_node(node)
    else
      prompt
      |> add_lookup(name, %{"MODEL" => model})
    end
  end

  @spec maybe_add_smoothed_energy_guidance(prompt(), [
          {:model, ref_node_value()}
          | {:name, binary()}
          | {:attrs, map()}
          | {:add, boolean()}
        ]) :: prompt()
  def maybe_add_sliding_window_guidance(prompt, options \\ []) do
    name = Keyword.get(options, :name, "sliding_window_guidance")
    model = Keyword.get(options, :model)
    add = Keyword.get(options, :add, true)
    attrs = Keyword.get(options, :attrs, %{})

    sliding_window_guidance =
      Map.get(attrs, "sliding_window_guidance", %{})

    if add do
      node =
        node(name, "SlidingWindowGuidanceAdvanced", %{
          model: model,
          scale: Map.get(sliding_window_guidance, "scale"),
          sigma_start: Map.get(sliding_window_guidance, "sigma_start"),
          sigma_end: Map.get(sliding_window_guidance, "sigma_end"),
          tile_width: Map.get(sliding_window_guidance, "tile_width"),
          tile_height: Map.get(sliding_window_guidance, "tile_height"),
          tile_overlap: Map.get(sliding_window_guidance, "tile_overlap")
        })
        |> add_node_output("MODEL", node_ref(name, 0))

      prompt
      |> add_node(node)
    else
      prompt
      |> add_lookup(name, %{"MODEL" => model})
    end
  end

  @spec add_guidance_group(prompt(), [
          {:model, ref_node_value()}
          | {:attrs, map()}
          | {:name, binary()}
        ]) :: prompt()
  def add_guidance_group(prompt, options \\ []) do
    name = Keyword.get(options, :name, "guidance_group")
    model = Keyword.get(options, :model)
    attrs = Keyword.get(options, :attrs)

    prompt
    |> maybe_add_self_attention_guidance(
      model: model,
      name: "self_attention_guidance",
      attrs: attrs,
      add: get_in(attrs, ["self_attention_guidance", "is_enabled"]) || false
    )
    |> then(
      &maybe_add_perturbed_attention_guidance(&1,
        model: get_lookup_value(&1, "self_attention_guidance", "MODEL"),
        add: get_in(attrs, ["perturbed_attention_guidance", "is_enabled"]) || false,
        attrs: attrs
      )
    )
    |> then(
      &maybe_add_smoothed_energy_guidance(&1,
        model: get_lookup_value(&1, "perturbed_attention_guidance", "MODEL"),
        add: get_in(attrs, ["smoothed_energy_guidance", "is_enabled"]) || false,
        attrs: attrs
      )
    )
    |> then(
      &maybe_add_sliding_window_guidance(&1,
        model: get_lookup_value(&1, "smoothed_energy_guidance", "MODEL"),
        add: get_in(attrs, ["sliding_window_guidance", "is_enabled"]) || false,
        attrs: attrs
      )
    )
    |> then(
      &maybe_add_skimmed_cfg(&1,
        name: "skimmed_cfg",
        model: get_lookup_value(&1, "sliding_window_guidance", "MODEL"),
        skimming_cfg: get_in(attrs, ["skimmed_cfg", "skimming_cfg"]) || 6,
        full_skim_negative: get_in(attrs, ["skimmed_cfg", "full_skim_negative"]),
        disable_flipping_filter: get_in(attrs, ["skimmed_cfg", "disable_flipping_filter"]),
        add: get_in(attrs, ["skimmed_cfg", "is_enabled"]) || false
      )
    )
    |> then(
      &add_lookup(&1, name, %{
        "MODEL" => get_lookup_value(&1, "skimmed_cfg", "MODEL")
      })
    )
  end

  @spec maybe_add_self_attention_guidance(prompt(), [
          {:model, ref_node_value()}
          | {:attrs, map()}
          | {:name, binary()}
          | {:add, boolean()}
        ]) :: prompt()
  def maybe_add_self_attention_guidance(prompt, options \\ []) do
    name = Keyword.get(options, :name, "self_attention_guidance")
    model = Keyword.get(options, :model)
    add = Keyword.get(options, :add, false)
    attrs = Keyword.get(options, :attrs, %{})
    self_attention_guidance = Map.get(attrs, "self_attention_guidance", %{})

    if add do
      node =
        node(name, "SelfAttentionGuidance", %{
          model: model,
          scale: Map.get(self_attention_guidance, "scale"),
          blur_sigma: Map.get(self_attention_guidance, "blur_sigma")
        })
        |> add_node_output("MODEL", node_ref(name, 0))

      prompt
      |> add_node(node)
    else
      prompt
      |> add_lookup(name, %{"MODEL" => model})
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

  defp sd_35_model?(%{"model" => model_name} = _attrs) do
    model_name
    |> String.match?(~r/(flux|3\.?5)/i)
  end

  defp pony_model?(%{"model" => model_name} = _attrs) do
    model_name
    |> String.downcase()
    |> String.contains?("pony")
  end

  defp flux_model?(%{"model" => model_name} = _attrs) do
    model_name
    |> String.downcase()
    |> String.contains?("flux")
  end

  defp get_last_lora_node_name(loras) do
    "positive_lora#{length(loras) - 1}"
  end

  defp get_last_ip_adapter_node_name(ip_adapters) do
    "ip_adapter_#{length(ip_adapters) - 1}"
  end

  defp get_last_cn_node_name(controlnets) do
    "cn#{length(controlnets) - 1}_apply_controlnet"
  end
end
