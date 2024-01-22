defmodule ExSd.ComfyClient do
  require Logger

  alias ExSd.Sd.ControlNetArgs
  alias ExSd.Sd.GenerationParams

  def generate_image(%GenerationParams{txt2img: true} = generation_params, attrs, client_id) do
    Logger.info("Generating txt2img")
    Logger.debug(%{attrs: attrs})

    generation_params
    |> Map.delete(:mask)
    |> Map.delete(:init_images)
    |> Logger.info()

    seed = generation_params.seed

    positive_loras = Map.get(attrs, "positive_loras")
    negative_loras = Map.get(attrs, "negative_loras")

    loras_subflow =
      get_loras_subflow(attrs)

    controlnet_args =
      generation_params
      |> get_in([Access.key(:alwayson_scripts), Access.key(:controlnet), Access.key(:args)])

    controlnet_subflow =
      if(is_nil(controlnet_args),
        do: %{},
        else: get_controlnet_subflow(controlnet_args, generation_params)
      )

    full_scale_pass = Map.get(attrs, "full_scale_pass", false)

    second_pass_scale_subflow =
      if(generation_params.hr_scale == 1,
        do: %{},
        else:
          get_scale_subflow(generation_params,
            positive_loras: positive_loras,
            controlnet_args: controlnet_args,
            seed: seed,
            attrs: attrs
          )
      )

    generation_params = %{
      prompt:
        %{
          model: %{
            class_type: "CheckpointLoaderSimple",
            inputs: %{
              ckpt_name: attrs["model"]
            }
          },
          vae: %{
            inputs: %{
              vae_name: attrs["vae"]
            },
            class_type: "VAELoader"
          },
          positive_prompt: %{
            class_type: "CLIPTextEncode",
            inputs: %{
              clip: [
                if(Enum.empty?(positive_loras),
                  do: "model",
                  else: "positive_lora#{length(positive_loras) - 1}"
                ),
                1
              ],
              text: generation_params.prompt
            }
          },
          negative_prompt: %{
            class_type: "CLIPTextEncode",
            inputs: %{
              clip: [
                if(Enum.empty?(positive_loras),
                  do: "model",
                  else: "positive_lora#{length(positive_loras) - 1}"
                ),
                1
              ],
              text: generation_params.negative_prompt
            }
          },
          empty_latent_image: %{
            class_type: "EmptyLatentImage",
            inputs: %{
              batch_size: 1,
              height: generation_params.height,
              width: generation_params.width
            }
          },
          sampler: %{
            class_type: "KSampler",
            inputs: %{
              cfg: generation_params.cfg_scale,
              denoise: 1,
              latent_image: [
                "empty_latent_image",
                0
              ],
              model: [
                if(Enum.empty?(positive_loras),
                  do: "model",
                  else: "positive_lora#{length(positive_loras) - 1}"
                ),
                0
              ],
              positive:
                if(is_nil(controlnet_args) or Enum.empty?(controlnet_args),
                  do: [
                    "positive_prompt",
                    0
                  ],
                  else: [
                    "cn#{length(controlnet_args) - 1}_apply_controlnet",
                    0
                  ]
                ),
              negative:
                if(is_nil(controlnet_args) or Enum.empty?(controlnet_args),
                  do: [
                    "negative_prompt",
                    0
                  ],
                  else: [
                    "cn#{length(controlnet_args) - 1}_apply_controlnet",
                    1
                  ]
                ),
              sampler_name: generation_params.sampler_name,
              scheduler: attrs["scheduler"] || "karras",
              seed: seed,
              steps: generation_params.steps
            }
          },
          vae_decode: %{
            class_type: "VAEDecode",
            inputs: %{
              samples: [
                if(
                  Map.get(attrs, "scale") > 1 or
                    (Map.get(attrs, "scale") < 1 and full_scale_pass),
                  do: "hires_sampler",
                  else: "sampler"
                ),
                0
              ],
              vae: get_vae(attrs)
            }
          },
          output: %{
            class_type: "Base64ImageOutput",
            inputs: %{
              # filename_prefix: "ComfyUI",
              images: [
                "vae_decode",
                0
              ]
            }
          }
        }
        |> Map.merge(loras_subflow)
        |> Map.merge(controlnet_subflow)
        |> Map.merge(second_pass_scale_subflow)
        |> tap(&Logger.info(&1)),
      client_id: client_id
    }

    with {:ok, response} <-
           post(
             "/prompt",
             generation_params
           ),
         %{status: 200, body: body} <- response do
      {:ok, body}

      # seed =
      #   get_in(body, ["info"])
      #   |> Jason.decode!()
      #   |> get_in(["seed"])
    else
      res -> handle_error(res)
    end
  end

  def generate_image(%GenerationParams{txt2img: false} = generation_params, attrs, client_id) do
    Logger.info("Generating img2img")
    Logger.debug(generation_params)
    Logger.debug(attrs)
    # generation_params
    # |> Map.delete(:mask)
    # |> Map.delete(:init_images)
    # |> Logger.info()
    seed = generation_params.seed

    full_scale_pass = Map.get(attrs, "full_scale_pass", false)
    has_full_scale_pass = full_scale_pass and attrs["scale"] < 1

    positive_loras = Map.get(attrs, "positive_loras")
    negative_loras = Map.get(attrs, "negative_loras")

    loras_subflow =
      get_loras_subflow(attrs)

    controlnet_args =
      generation_params
      |> get_in([Access.key(:alwayson_scripts), Access.key(:controlnet), Access.key(:args)])

    controlnet_subflow =
      if(is_nil(controlnet_args),
        do: %{},
        else: get_controlnet_subflow(controlnet_args, generation_params)
      )

    has_ultimate_upscale = attrs["ultimate_upscale"]

    is_sd_xl = attrs["model"] |> String.downcase() |> String.contains?("xl")

    ultimate_upscale_subflow =
      if(has_ultimate_upscale,
        do:
          get_ultimate_upscale_subflow(generation_params,
            controlnet_args: controlnet_args,
            positive_loras: positive_loras,
            seed: seed,
            is_sd_xl: is_sd_xl,
            attrs: attrs
          ),
        else: %{}
      )

    generation_params = %{
      prompt:
        %{
          model: %{
            class_type: "CheckpointLoaderSimple",
            inputs: %{
              ckpt_name: attrs["model"]
            }
          },
          # "5": %{
          #   class_type: "EmptyLatentImage",
          #   inputs: %{
          #     batch_size: 1,
          #     height: generation_params.height,
          #     width: generation_params.width
          #   }
          # },
          positive_prompt: %{
            class_type: "CLIPTextEncode",
            inputs: %{
              clip: [
                if(Enum.empty?(positive_loras),
                  do: "model",
                  else: "positive_lora#{length(positive_loras) - 1}"
                ),
                1
              ],
              text: generation_params.prompt
            }
          },
          negative_prompt: %{
            class_type: "CLIPTextEncode",
            inputs: %{
              clip: [
                if(Enum.empty?(positive_loras),
                  do: "model",
                  else: "positive_lora#{length(positive_loras) - 1}"
                ),
                1
              ],
              text: generation_params.negative_prompt
            }
          },
          vae: %{
            inputs: %{
              vae_name: attrs["vae"]
            },
            class_type: "VAELoader"
          },
          image_input: %{
            inputs: %{
              # TODO: Scale image if needed since width and height aren't passed
              bas64_image:
                String.replace(
                  List.first(generation_params.init_images),
                  "data:image/png;base64,",
                  ""
                )
            },
            class_type: "Base64ImageInput"
          },
          scaler: %{
            inputs: %{
              # "nearest-exact",
              upscale_method: "lanczos",
              width: generation_params.width,
              height: generation_params.height,
              crop: "disabled",
              image: [
                if(generation_params.hr_upscaler == "None" or generation_params.hr_scale < 1,
                  do: "image_input",
                  else: "upscale_with_model"
                ),
                0
              ]
            },
            class_type: "ImageScale"
          },
          upscale_with_model: %{
            inputs: %{
              upscale_model: [
                "upscaler",
                0
              ],
              image: [
                "image_input",
                0
              ]
            },
            class_type: "ImageUpscaleWithModel"
          },
          upscaler: %{
            inputs: %{
              model_name: generation_params.hr_upscaler
            },
            class_type: "UpscaleModelLoader"
          },
          vae_encode: %{
            inputs: %{
              pixels: [
                if(
                  has_ultimate_upscale or
                    attrs["scale"] == 1 or
                    generation_params.hr_upscaler == "Latent",
                  do: "image_input",
                  else: "scaler"
                ),
                0
              ],
              vae: get_vae(attrs)
            },
            class_type: "VAEEncode"
          },
          mask_base64: %{
            inputs: %{
              # TODO: Scale image if needed since width and height aren't passed
              bas64_image:
                String.replace(
                  generation_params.mask,
                  "data:image/png;base64,",
                  ""
                )
            },
            class_type: "Base64ImageInput"
          },
          image_to_mask: %{
            inputs: %{
              channel: "red",
              image: [
                "mask_base64",
                0
              ]
            },
            class_type: "ImageToMask"
          },
          latent_noise_mask: %{
            inputs: %{
              samples: [
                "vae_encode",
                0
              ],
              mask: [
                "image_to_mask",
                0
              ]
            },
            class_type: "SetLatentNoiseMask"
          },
          latent_upscaler: %{
            inputs: %{
              samples: [
                "latent_noise_mask",
                0
              ],
              upscale_method: "nearest-exact",
              width: generation_params.width,
              height: generation_params.height,
              crop: "disabled"
            },
            class_type: "LatentUpscale"
          },
          sampler: %{
            class_type: "KSampler",
            inputs: %{
              cfg: generation_params.cfg_scale,
              denoise: generation_params.denoising_strength,
              latent_image: [
                if(
                  not has_ultimate_upscale and generation_params.hr_upscaler == "Latent" and
                    attrs["scale"] != 1,
                  do: "latent_upscaler",
                  else: "latent_noise_mask"
                ),
                0
              ],
              model: [
                if(Enum.empty?(positive_loras),
                  do: "model",
                  else: "positive_lora#{length(positive_loras) - 1}"
                ),
                0
              ],
              positive:
                if(is_nil(controlnet_args) or Enum.empty?(controlnet_args),
                  do: [
                    "positive_prompt",
                    0
                  ],
                  else: [
                    "cn#{length(controlnet_args) - 1}_apply_controlnet",
                    0
                  ]
                ),
              negative:
                if(is_nil(controlnet_args) or Enum.empty?(controlnet_args),
                  do: [
                    "negative_prompt",
                    0
                  ],
                  else: [
                    "cn#{length(controlnet_args) - 1}_apply_controlnet",
                    1
                  ]
                ),
              sampler_name: generation_params.sampler_name,
              scheduler: attrs["scheduler"] || "karras",
              seed: seed,
              steps: generation_params.steps
            }
          },
          second_pass_latent_upscaler: %{
            inputs: %{
              samples: [
                "sampler",
                0
              ],
              # "nearest-exact",
              upscale_method: "lanczos",
              width:
                ExSd.Sd.SdService.round_to_closest_multiple_of_8_down(
                  generation_params.width * (1 / generation_params.hr_scale)
                ),
              height:
                ExSd.Sd.SdService.round_to_closest_multiple_of_8_down(
                  generation_params.height * (1 / generation_params.hr_scale)
                ),
              crop: "disabled"
            },
            class_type: "LatentUpscale"
          },
          first_pass_vae_decode: %{
            class_type: "VAEDecode",
            inputs: %{
              samples: [
                "sampler",
                0
              ],
              vae: get_vae(attrs)
            }
          },
          fullscale_upscale_with_model: %{
            inputs: %{
              upscale_model: [
                "upscaler",
                0
              ],
              image: [
                "first_pass_vae_decode",
                0
              ]
            },
            class_type: "ImageUpscaleWithModel"
          },
          second_pass_scaler: %{
            inputs: %{
              # "nearest-exact",
              upscale_method: "lanczos",
              width:
                ExSd.Sd.SdService.round_to_closest_multiple_of_8_down(
                  generation_params.width * (1 / generation_params.hr_scale)
                ),
              height:
                ExSd.Sd.SdService.round_to_closest_multiple_of_8_down(
                  generation_params.height * (1 / generation_params.hr_scale)
                ),
              crop: "disabled",
              image: [
                if(!has_full_scale_pass or generation_params.hr_upscaler == "None",
                  do: "first_pass_vae_decode",
                  else: "fullscale_upscale_with_model"
                ),
                0
              ]
            },
            class_type: "ImageScale"
          },
          second_pass_vae_encode: %{
            inputs: %{
              pixels: [
                "second_pass_scaler",
                0
              ],
              vae: get_vae(attrs)
            },
            class_type: "VAEEncode"
          },
          second_pass_sampler: %{
            class_type: "KSampler",
            inputs: %{
              cfg: generation_params.cfg_scale,
              denoise: generation_params.sp_denoising_strength,
              latent_image: [
                # TODO: for upscaler other than latent use upscale with model flow instead
                if(generation_params.hr_upscaler == "Latent",
                  do: "second_pass_latent_upscaler",
                  else: "second_pass_vae_encode"
                ),
                0
              ],
              model: [
                if(Enum.empty?(positive_loras),
                  do: "model",
                  else: "positive_lora#{length(positive_loras) - 1}"
                ),
                0
              ],
              positive:
                if(is_nil(controlnet_args) or Enum.empty?(controlnet_args),
                  do: [
                    "positive_prompt",
                    0
                  ],
                  else: [
                    "cn#{length(controlnet_args) - 1}_apply_controlnet",
                    0
                  ]
                ),
              negative:
                if(is_nil(controlnet_args) or Enum.empty?(controlnet_args),
                  do: [
                    "negative_prompt",
                    0
                  ],
                  else: [
                    "cn#{length(controlnet_args) - 1}_apply_controlnet",
                    1
                  ]
                ),
              sampler_name: generation_params.sampler_name,
              scheduler: attrs["scheduler"] || "karras",
              seed: seed,
              steps: generation_params.steps
            }
          },
          # TODO: Add upscaler step if scale is < 1 and full scale pass is active
          vae_decode: %{
            class_type: "VAEDecode",
            inputs: %{
              samples: [
                if(
                  has_full_scale_pass and not has_ultimate_upscale and
                    generation_params.hr_scale < 1,
                  do: "second_pass_sampler",
                  else: "sampler"
                ),
                0
              ],
              vae: get_vae(attrs)
            }
          },
          output: %{
            class_type: "Base64ImageOutput",
            inputs: %{
              # filename_prefix: "ComfyUI",
              images: [
                if(
                  has_ultimate_upscale,
                  do: "ultimate_upscale",
                  else: "vae_decode"
                ),
                0
              ]
            }
          }
        }
        |> Map.merge(loras_subflow)
        |> Map.merge(controlnet_subflow)
        |> Map.merge(ultimate_upscale_subflow)
        |> tap(&Logger.debug(&1)),
      client_id: client_id
    }

    with {:ok, response} <-
           post(
             "/prompt",
             generation_params
           ),
         %{status: 200, body: body} <- response do
      {:ok, body}

      # seed =
      #   get_in(body, ["info"])
      #   |> Jason.decode!()
      #   |> get_in(["seed"])
    else
      res -> handle_error(res)
    end
  end

  @spec generate_image(GenerationParams.t()) :: any
  def generate_image(generation_params) do
    Logger.info("Generating img2img")

    Logger.debug(
      generation_params
      |> Map.delete(:mask)
      |> Map.delete(:init_images)
    )

    with {:ok, response} <-
           post(
             "/img2img",
             generation_params
           ),
         %{status: 200, body: body} <- response do
      seed =
        get_in(body, ["info"])
        |> Jason.decode!()
        |> get_in(["seed"])

      %{images: Map.get(body, "images"), seed: seed}
    else
      res -> handle_error(res)
    end
  end

  def interrupt() do
    {:ok, _response} = post("/interrupt", %{})
  end

  def get_progress() do
    with response <- get("/queue"),
         {:ok, body} <- handle_response(response) do
      {:ok, body}
    else
      {:error, _error} = res ->
        res
    end
  end

  def post_active_model(model_title) do
    with response <- post("/options", %{sd_model_checkpoint: model_title}),
         {:ok, body} <- handle_response(response) do
      Logger.info(body)
      {:ok, body}
    else
      {:error, _error} = res ->
        res
    end
  end

  @spec get_memory_usage ::
          {:error, any}
          | {:ok, %{optional(<<_::24, _::_*8>>) => %{optional(<<_::32, _::_*8>>) => 0 | 1 | map}}}
  def get_memory_usage() do
    with response <- get("/system_stats"),
         {:ok, body} <- handle_response(response) do
      %{
        "devices" => [
          %{
            "vram_free" => free_cuda,
            "vram_total" => total_cuda
          }
        ]
      } = body

      {:ok,
       %{
         "ram" => %{
           "free" => 0,
           "used" => 0,
           "total" => 1
         },
         "cuda" => %{
           "system" => %{
             "free" => free_cuda,
             "used" => total_cuda - free_cuda,
             "total" => total_cuda
           }
         }
       }}
    else
      {:error, _error} = res ->
        res
    end
  end

  def free_memory() do
    with response <- post("/free"),
         {:ok, body} <- handle_response(response) do
      Logger.info(body)
      {:ok, body}
    else
      {:error, _error} = res ->
        res
    end
  end

  def get_samplers() do
    with response <- get("/object_info/KSampler"),
         {:ok, body} <- handle_response(response) do
      sampler_names =
        body
        |> get_in(["KSampler", "input", "required", "sampler_name"])
        |> List.first()

      {:ok, sampler_names}
    else
      {:error, _error} = res ->
        res
    end
  end

  def get_schedulers() do
    with response <- get("/object_info/KSampler"),
         {:ok, body} <- handle_response(response) do
      sampler_names =
        body
        |> get_in(["KSampler", "input", "required", "scheduler"])
        |> List.first()

      {:ok, sampler_names}
    else
      {:error, _error} = res ->
        res
    end
  end

  def get_controlnet_models() do
    with response <- get("/object_info/ControlNetLoader"),
         {:ok, body} <- handle_response(response) do
      models =
        body
        |> get_in(["ControlNetLoader", "input", "required", "control_net_name"])
        |> List.first()

      {:ok, models}
    else
      {:error, _error} = res ->
        res
    end
  end

  def get_controlnet_preprocessors() do
    with response <- get("/object_info/AIO_Preprocessor"),
         {:ok, body} <- handle_response(response) do
      preprocessors_node =
        get_in(body, ["AIO_Preprocessor", "input", "required", "preprocessor"]) ||
          get_in(body, ["AIO_Preprocessor", "input", "optional", "preprocessor"])

      controlnet_preprocessors =
        preprocessors_node
        |> List.first()
        |> List.insert_at(0, "InpaintPreprocessor")
        |> List.insert_at(0, "Invert")

      {:ok, controlnet_preprocessors}
    else
      {:error, _error} = res ->
        res
    end
  end

  # @spec controlnet_detect(any) :: {:error, any} | {:ok, list}
  # def controlnet_detect(params) do
  #   with response <- post("/detect", params, "#{get_base_url()}/controlnet"),
  #        {:ok, body} <- handle_response(response) do
  #     {:ok, body["images"] |> Enum.map(&"data:image/png;base64,#{&1}")}
  #   else
  #     {:error, _error} = res ->
  #       res
  #   end
  # end

  def get_models() do
    with response <- get("/object_info/CheckpointLoader"),
         {:ok, body} <- handle_response(response) do
      loras =
        body
        |> get_in(["CheckpointLoader", "input", "required", "ckpt_name"])
        |> List.first()

      {:ok, loras}
    else
      {:error, _error} = res ->
        res
    end
  end

  def get_vaes() do
    with response <- get("/object_info/VAELoader"),
         {:ok, body} <- handle_response(response) do
      vaes =
        body
        |> get_in(["VAELoader", "input", "required", "vae_name"])
        |> List.first()

      {:ok, vaes}
    else
      {:error, _error} = res ->
        res
    end
  end

  def get_history(prompt_id) do
    with response <- get("/history/#{prompt_id}"),
         {:ok, body} <- handle_response(response) do
      result_filename =
        body
        |> get_in([prompt_id, "outputs", "9", "images"])
        |> List.first()
        |> Map.get("filename")

      {:ok, result_filename}
    else
      {:error, _error} = res ->
        res
    end
  end

  def get_image(filename) do
    with response <- get_binary("/view?filename=#{filename}&type=temp"),
         {:ok, body} <- handle_response(response) do
      image =
        body

      image = Base.encode64(image)
      {:ok, image}
    else
      {:error, _error} = res ->
        res
    end
  end

  def post_image(image) do
    with response <- post("/upload/image", image),
         {:ok, body} <- handle_response(response) do
      Logger.info(body)
      {:ok, body}
    else
      {:error, _error} = res ->
        res
    end
  end

  def refresh_models() do
    with response <- post("/refresh-checkpoints", %{}),
         {:ok, body} <- handle_response(response) do
      {:ok, body}
    else
      {:error, _error} = res ->
        res
    end
  end

  def get_upscalers() do
    with response <- get("/object_info/UpscaleModelLoader"),
         {:ok, body} <- handle_response(response) do
      upscalers =
        body
        |> get_in(["UpscaleModelLoader", "input", "required", "model_name"])
        |> List.first()

      {:ok, upscalers}
    else
      {:error, _error} = res ->
        res
    end
  end

  def get_loras() do
    with response <- get("/object_info/LoraLoader"),
         {:ok, body} <- handle_response(response) do
      loras =
        body
        |> get_in(["LoraLoader", "input", "required", "lora_name"])
        |> List.first()
        |> Enum.map(&%{name: &1})

      {:ok, loras}
    else
      {:error, _error} = res ->
        res
    end
  end

  def get_embeddings() do
    with response <- get("/embeddings"),
         {:ok, body} <- handle_response(response) do
      {:ok, body}
    else
      {:error, _error} = res ->
        res
    end
  end

  def get_options() do
    with response <- get("/options"),
         {:ok, body} <- handle_response(response) do
      {:ok, body}
    else
      {:error, _error} = res ->
        res
    end
  end

  def get_png_info(png_data_url) do
    with response <- post("/png-info", %{image: png_data_url}),
         {:ok, body} <- handle_response(response) do
      {:ok, body}
    else
      {:error, _error} = res ->
        res
    end
  end

  # TODO: implement comfy equivalent
  def get_scripts() do
    with response <- get("/scripts"),
         {:ok, body} <- handle_response(response) do
      {:ok, body}
    else
      {:error, _error} = res ->
        res
    end
  end

  defp handle_response(resp) do
    case resp do
      {:ok, %{body: body, status: status}} when status >= 200 and status < 400 ->
        {:ok, body}

      _ ->
        handle_error(resp)
    end
  end

  defp handle_error(resp) do
    case resp do
      {:error, error} when is_struct(error) ->
        {:error, Map.from_struct(error)}

      {:error, error} when is_struct(error) ->
        {:error, error}

      {:ok, %{body: %{"detail" => "Not Found"}, status: 404}} ->
        {:error, "Not Found"}

      %{status: status} = res when status >= 400 ->
        {:error, res.body}

      {:ok, %{status: status} = res} when status >= 400 ->
        {:error, res.body}

      {:ok, res} ->
        {:error, res.body}

      res ->
        Logger.error(res)
        {:error, res.body}
    end
  end

  @spec get(binary(), binary() | nil) :: {:ok, Finch.Response.t()}
  def get(url, base_url \\ "#{get_base_url()}") do
    case Finch.build(:get, "#{base_url}#{url}")
         |> Finch.request(ExSd.Finch, receive_timeout: 1_000_000_000_000) do
      {:ok, response} -> {:ok, %{response | body: Jason.decode!(response.body)}}
      response -> response
    end
  end

  @spec get_binary(binary(), binary() | nil) :: {:ok, Finch.Response.t()}
  def get_binary(url, base_url \\ "#{get_base_url()}") do
    case Finch.build(:get, "#{base_url}#{url}")
         |> Finch.request(ExSd.Finch, receive_timeout: 1_000_000_000_000) do
      {:ok, response} -> {:ok, %{response | body: response.body}}
      response -> response
    end
  end

  def post(url, body \\ %{}, base_url \\ "#{get_base_url()}") do
    case Finch.build(:post, "#{base_url}#{url}", [], Jason.encode!(body))
         |> Finch.request(ExSd.Finch, receive_timeout: 1_000_000_000_000) do
      {:ok, response} ->
        response.body |> tap(&Logger.debug(&1))

        {:ok,
         %{
           response
           | body:
               if(is_binary(response.body), do: response.body, else: Jason.decode!(response.body))
         }}

      response ->
        response
    end
  end

  def get_base_url() do
    Application.fetch_env!(:ex_sd, :comfy_client_base_url)
  end

  defp get_loras_subflow(
         %{"positive_loras" => positive_loras, "negative_loras" => negative_loras} = _attrs
       ) do
    result =
      positive_loras
      |> Enum.with_index()
      |> Enum.reduce(%{}, fn {%{name: name, value: value}, index}, acc ->
        Map.merge(acc, %{
          "positive_lora#{index}": %{
            inputs: %{
              model: [
                if(index > 0,
                  do: "positive_lora#{index - 1}",
                  else: "model"
                ),
                0
              ],
              clip: [
                if(index > 0,
                  do: "positive_lora#{index - 1}",
                  else: "model"
                ),
                1
              ],
              lora_name: "#{name}.safetensors",
              strength_model: value,
              strength_clip: value
            },
            class_type: "LoraLoader"
          }
        })
      end)

    result
  end

  defp get_controlnet_subflow(controlnet_args, generation_params) do
    active_layers = length(controlnet_args)

    controlnet_args
    |> Enum.with_index()
    |> Enum.reduce(%{}, fn {%ControlNetArgs{} = entry, index}, acc ->
      Map.merge(acc, %{
        "cn#{index}_image": %{
          inputs: %{
            # TODO: Scale image if needed since width and height aren't passed
            bas64_image:
              String.replace(
                entry.input_image || generation_params.init_images |> List.first(),
                "data:image/png;base64,",
                ""
              )
          },
          class_type: "Base64ImageInput"
        },
        "cn#{index}_controlnet_loader": %{
          inputs: %{
            control_net_name: entry.model
          },
          class_type: "ControlNetLoader"
        },
        "cn#{index}_apply_controlnet": %{
          inputs: %{
            strength: entry.weight,
            start_percent: entry.guidance_start,
            end_percent: entry.guidance_end,
            positive:
              if(active_layers > 1 and index > 0,
                do: [
                  "cn#{index - 1}_apply_controlnet",
                  0
                ],
                else: [
                  "positive_prompt",
                  0
                ]
              ),
            negative:
              if(active_layers > 1 and index > 0,
                do: [
                  "cn#{index - 1}_apply_controlnet",
                  1
                ],
                else: [
                  "negative_prompt",
                  0
                ]
              ),
            control_net: [
              "cn#{index}_controlnet_loader",
              0
            ],
            image: [
              if(
                entry.module == "none",
                do: "cn#{index}_image",
                else: "cn#{index}_preprocessor"
              ),
              0
            ]
          },
          class_type: "ControlNetApplyAdvanced"
        }
      })
      |> Map.merge(
        if(entry.module == "none",
          do: %{},
          else: %{
            "cn#{index}_preprocessor": controlnet_preprocessor(index, %{}, entry.module)
          }
        )
      )
    end)
  end

  defp get_ultimate_upscale_subflow(%GenerationParams{} = generation_params,
         controlnet_args: controlnet_args,
         positive_loras: positive_loras,
         seed: seed,
         is_sd_xl: is_sd_xl,
         attrs: attrs
       ) do
    %{
      ultimate_upscale: %{
        inputs: %{
          seed: seed,
          steps: generation_params.steps,
          cfg: generation_params.cfg_scale,
          sampler_name: generation_params.sampler_name,
          scheduler: attrs["scheduler"] || "karras",
          denoise: generation_params.denoising_strength,
          mode_type: "Linear",
          # TODO: use 1024 with XL
          tile_width: if(is_sd_xl, do: 1024, else: 512),
          # TODO: use 1024 with XL
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
          upscaled_image: [
            "scaler",
            0
          ],
          model: [
            if(Enum.empty?(positive_loras),
              do: "model",
              else: "positive_lora#{length(positive_loras) - 1}"
            ),
            0
          ],
          positive:
            if(is_nil(controlnet_args) or Enum.empty?(controlnet_args),
              do: [
                "positive_prompt",
                0
              ],
              else: [
                "cn#{length(controlnet_args) - 1}_apply_controlnet",
                0
              ]
            ),
          negative:
            if(is_nil(controlnet_args) or Enum.empty?(controlnet_args),
              do: [
                "negative_prompt",
                0
              ],
              else: [
                "cn#{length(controlnet_args) - 1}_apply_controlnet",
                1
              ]
            ),
          vae: get_vae(attrs)
        },
        class_type: "UltimateSDUpscaleNoUpscale"
      }
    }
  end

  defp get_scale_subflow(%GenerationParams{} = generation_params,
         positive_loras: positive_loras,
         controlnet_args: controlnet_args,
         seed: seed,
         attrs: attrs
       ) do
    %{
      hires_latent_scaler: %{
        inputs: %{
          samples: [
            "sampler",
            0
          ],
          upscale_method: "nearest-exact",
          width:
            ExSd.Sd.SdService.round_to_closest_multiple_of_8_down(
              if(generation_params.hr_scale < 1,
                do: generation_params.width * (1 / generation_params.hr_scale),
                else: generation_params.width * generation_params.hr_scale
              )
            ),
          height:
            ExSd.Sd.SdService.round_to_closest_multiple_of_8_down(
              if(generation_params.hr_scale < 1,
                do: generation_params.height * (1 / generation_params.hr_scale),
                else: generation_params.height * generation_params.hr_scale
              )
            ),
          crop: "disabled"
        },
        class_type: "LatentUpscale"
      },
      first_pass_vae_decode: %{
        class_type: "VAEDecode",
        inputs: %{
          samples: [
            "sampler",
            0
          ],
          vae: get_vae(attrs)
        }
      },
      scaler: %{
        inputs: %{
          # "nearest-exact",
          upscale_method: "lanczos",
          width:
            ExSd.Sd.SdService.round_to_closest_multiple_of_8_down(
              if(generation_params.hr_scale < 1,
                do: generation_params.width * (1 / generation_params.hr_scale),
                else: generation_params.width * generation_params.hr_scale
              )
            ),
          height:
            ExSd.Sd.SdService.round_to_closest_multiple_of_8_down(
              if(generation_params.hr_scale < 1,
                do: generation_params.height * (1 / generation_params.hr_scale),
                else: generation_params.height * generation_params.hr_scale
              )
            ),
          crop: "disabled",
          image: [
            if(generation_params.hr_upscaler == "None" or generation_params.hr_scale < 1,
              do: "first_pass_vae_decode",
              else: "upscale_with_model"
            ),
            0
          ]
        },
        class_type: "ImageScale"
      },
      upscale_with_model: %{
        inputs: %{
          upscale_model: [
            "upscaler",
            0
          ],
          image: [
            "first_pass_vae_decode",
            0
          ]
        },
        class_type: "ImageUpscaleWithModel"
      },
      upscaler: %{
        inputs: %{
          model_name: generation_params.hr_upscaler
        },
        class_type: "UpscaleModelLoader"
      },
      second_pass_vae_encode: %{
        inputs: %{
          pixels: [
            "scaler",
            0
          ],
          vae: get_vae(attrs)
        },
        class_type: "VAEEncode"
      },
      hires_sampler: %{
        class_type: "KSampler",
        inputs: %{
          cfg: generation_params.cfg_scale,
          denoise: generation_params.sp_denoising_strength,
          latent_image: [
            if(generation_params.hr_upscaler == "Latent",
              do: "hires_latent_scaler",
              else: "second_pass_vae_encode"
            ),
            0
          ],
          model: [
            if(Enum.empty?(positive_loras),
              do: "model",
              else: "positive_lora#{length(positive_loras) - 1}"
            ),
            0
          ],
          positive:
            if(is_nil(controlnet_args) or Enum.empty?(controlnet_args),
              do: [
                "positive_prompt",
                0
              ],
              else: [
                "cn#{length(controlnet_args) - 1}_apply_controlnet",
                0
              ]
            ),
          negative:
            if(is_nil(controlnet_args) or Enum.empty?(controlnet_args),
              do: [
                "negative_prompt",
                0
              ],
              else: [
                "cn#{length(controlnet_args) - 1}_apply_controlnet",
                1
              ]
            ),
          sampler_name: generation_params.sampler_name,
          scheduler: attrs["scheduler"] || "karras",
          seed: seed,
          steps: generation_params.steps
        }
      }
    }
  end

  @spec controlnet_preprocessor(number(), map(), binary()) :: map()
  def controlnet_preprocessor(index, _args, "CannyEdgePreprocessor") do
    %{
      inputs: %{
        # TODO: link to params
        low_threshold: 100,
        high_threshold: 200,
        image: [
          "cn#{index}_image",
          0
        ]
      },
      class_type: "CannyEdgePreprocessor"
    }
  end

  def controlnet_preprocessor(index, _args, "LineArtPreprocessor") do
    %{
      inputs: %{
        # TODO: link to params
        coarse: "disable",
        image: [
          "cn#{index}_image",
          0
        ]
      },
      class_type: "LineArtPreprocessor"
    }
  end

  def controlnet_preprocessor(index, _args, "TilePreprocessor") do
    %{
      inputs: %{
        # TODO: link to params
        pyrUp_iters: 1,
        image: [
          "cn#{index}_image",
          0
        ]
      },
      class_type: "TilePreprocessor"
    }
  end

  def controlnet_preprocessor(index, _args, "InpaintPreprocessor") do
    %{
      inputs: %{
        # TODO: link to params
        image: [
          "cn#{index}_image",
          0
        ],
        mask: [
          "image_to_mask",
          0
        ]
      },
      class_type: "InpaintPreprocessor"
    }
  end

  def controlnet_preprocessor(index, _args, "Invert") do
    %{
      inputs: %{
        image: [
          "cn#{index}_image",
          0
        ]
      },
      class_type: "ImageInvert"
    }
  end

  def controlnet_preprocessor(index, _args, preprocessor) do
    %{
      inputs: %{
        image: [
          "cn#{index}_image",
          0
        ],
        preprocessor: preprocessor
      },
      class_type: "AIO_Preprocessor"
    }
  end

  defp get_vae(attrs) do
    vae = attrs["vae"]

    if(vae |> String.downcase() == "automatic",
      do: ["model", 2],
      else: ["vae", 0]
    )
  end
end
