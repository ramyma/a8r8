defmodule ExSd.Sd.ComfyPromptTest do
  use ExUnit.Case, async: true

  alias ExSd.Sd.ComfyPrompt

  test "node", %{} do
    actual = ComfyPrompt.node(:test, "test_class", [%{test: ["test", 2]}])

    assert actual == %{
             test: %{
               class_type: "test_class",
               inputs: [%{test: ["test", 2]}]
             }
           }

    assert ComfyPrompt.node(:test, "test_class", [%{test: "value"}]) == %{
             test: %{
               class_type: "test_class",
               inputs: [%{test: "value"}]
             }
           }
  end

  test "add_node_input" do
    node = ComfyPrompt.node(:test1, "test_type")

    assert ComfyPrompt.add_node_input(
             node,
             :image,
             ComfyPrompt.node_ref("sampler", 1)
           ) == %{
             test1: %{
               inputs: %{
                 image: ["sampler", 1]
               },
               class_type: "test_type"
             }
           }
  end

  test "add_vae" do
    assert ComfyPrompt.add_vae_loader(ComfyPrompt.new(), "vae_name_test") ==
             ComfyPrompt.new(%{
               vae: %{
                 class_type: "VAELoader",
                 inputs: %{
                   vae_name: "vae_name_test"
                 }
               }
             })
  end

  test "add_model" do
    assert ComfyPrompt.add_model_loader(ComfyPrompt.new(), "model_name_test") ==
             ComfyPrompt.new(%{
               model: %{
                 class_type: "CheckpointLoaderSimple",
                 inputs: %{
                   ckpt_name: "model_name_test"
                 }
               }
             })
  end

  test "add_clip_text_encode" do
    assert ComfyPrompt.add_clip_text_encode(
             ComfyPrompt.new(),
             ComfyPrompt.node_ref("clip", 1),
             "pos prompt",
             :positive_prompt
           ) ==
             ComfyPrompt.new(%{
               positive_prompt: %{
                 class_type: "CLIPTextEncode",
                 inputs: %{
                   clip: ComfyPrompt.node_ref("clip", 1),
                   text: "pos prompt"
                 }
               }
             })
  end

  test "add_empty_latent_image" do
    assert ComfyPrompt.add_empty_latent_image(
             ComfyPrompt.new(),
             width: 512,
             height: 768,
             batch_size: 1
           ) ==
             ComfyPrompt.new(%{
               empty_latent_image: %{
                 class_type: "EmptyLatentImage",
                 inputs: %{
                   batch_size: 1,
                   height: 768,
                   width: 512
                 }
               }
             })
  end

  test "add_vae_decode" do
    assert ComfyPrompt.add_vae_decode(
             ComfyPrompt.new(),
             ComfyPrompt.node_ref("sampler", 0),
             ComfyPrompt.node_ref("vae", 0)
           ) ==
             %{
               prompt: %{
                 vae_decode: %{
                   class_type: "VAEDecode",
                   inputs: %{vae: ["vae", 0], samples: ["sampler", 0]}
                 }
               }
             }

    assert ComfyPrompt.add_vae_decode(
             ComfyPrompt.new(),
             ComfyPrompt.node_ref("sampler", 0),
             ComfyPrompt.node_ref("vae", 0),
             :vae_decode_node
           ) ==
             %{
               prompt: %{
                 vae_decode_node: %{
                   class_type: "VAEDecode",
                   inputs: %{vae: ["vae", 0], samples: ["sampler", 0]}
                 }
               }
             }
  end

  test "add_vae_encode" do
    assert ComfyPrompt.add_vae_encode(
             ComfyPrompt.new(),
             ComfyPrompt.node_ref("image", 0),
             ComfyPrompt.node_ref("vae", 0),
             :vae_encode_node
           ) ==
             %{
               prompt: %{
                 vae_encode_node: %{
                   class_type: "VAEEncode",
                   inputs: %{vae: ["vae", 0], pixels: ["image", 0]}
                 }
               }
             }
  end

  test "add_output" do
    init_node = ComfyPrompt.node(:test1, "test_type")

    assert ComfyPrompt.add_output(
             ComfyPrompt.new(init_node),
             ComfyPrompt.node_ref("sampler", 1)
           ) ==
             %{
               prompt:
                 Map.merge(
                   %{
                     output: %{
                       class_type: "Base64ImageOutput",
                       inputs: %{
                         images: ["sampler", 1]
                       }
                     }
                   },
                   init_node
                 )
             }
  end

  test "add_controlnet_apply_advanced" do
    controlnet_args = [
      %ExSd.Sd.ControlNetArgs{
        model: "test_cn_model1",
        module: "none",
        input_image: "data:image/png;base64,input_image"
      },
      %ExSd.Sd.ControlNetArgs{
        model: "test_cn_model2",
        module: "CannyEdgePreprocessor",
        guidance_start: 0.3,
        weight: 0.5
      }
    ]

    generation_params = %ExSd.Sd.GenerationParams{}
    attrs = %{"model" => "model_name"}

    assert ComfyPrompt.maybe_add_controlnet(
             ComfyPrompt.new(),
             controlnet_args,
             generation_params,
             attrs
           ) ==
             %{
               prompt: %{
                 cn0_apply_controlnet: %{
                   class_type: "ControlNetApplyAdvanced",
                   inputs: %{
                     control_net: ["cn0_controlnet_loader", 0],
                     end_percent: 1.0,
                     image: ["cn0_image", 0],
                     negative: ["negative_prompt", 0],
                     positive: ["positive_prompt", 0],
                     start_percent: 0,
                     strength: 1
                   }
                 },
                 cn0_controlnet_loader: %{
                   class_type: "ControlNetLoader",
                   inputs: %{control_net_name: "test_cn_model1"}
                 },
                 cn0_image: %{
                   class_type: "Base64ImageInput",
                   inputs: %{bas64_image: "input_image"}
                 },
                 cn1_apply_controlnet: %{
                   class_type: "ControlNetApplyAdvanced",
                   inputs: %{
                     positive: ["cn0_apply_controlnet", 0],
                     image: ["cn1_preprocessor", 0],
                     end_percent: 1.0,
                     negative: ["cn0_apply_controlnet", 1],
                     control_net: ["cn1_controlnet_loader", 0],
                     start_percent: 0.3,
                     strength: 0.5
                   }
                 },
                 cn1_controlnet_loader: %{
                   class_type: "ControlNetLoader",
                   inputs: %{control_net_name: "test_cn_model2"}
                 },
                 cn1_image: %{class_type: "Base64ImageInput", inputs: %{bas64_image: ""}},
                 cn1_preprocessor: %{
                   class_type: "CannyEdgePreprocessor",
                   inputs: %{image: ["cn1_image", 0], high_threshold: 200, low_threshold: 100}
                 }
               }
             }
  end

  test "txt2img" do
    generation_params = %ExSd.Sd.GenerationParams{
      prompt: "pos prompt",
      negative_prompt: "neg prompt",
      width: 512,
      height: 768,
      cfg_scale: 7,
      sampler_name: "euler",
      steps: 20,
      seed: 1,
      alwayson_scripts: %{
        controlnet: %ExSd.Sd.ControlNet{
          args: [
            %ExSd.Sd.ControlNetArgs{
              model: "model1",
              module: "module1"
            }
          ]
        }
      }
    }

    attrs =
      %{
        "model" => "model_name",
        "vae" => "vae_name",
        "scheduler" => "karras",
        "positive_loras" => [%{name: "lora1", value: 1}, %{name: "lora2", value: 0.2}],
        "scale" => 1
        # "negative_loras" => []
      }

    assert ComfyPrompt.txt2img(generation_params, attrs) ==
             %{
               prompt: %{
                 :empty_latent_image => %{
                   class_type: "EmptyLatentImage",
                   inputs: %{batch_size: 1, height: 768, width: 512}
                 },
                 :first_pass_vae_decode => %{
                   class_type: "VAEDecode",
                   inputs: %{samples: ["sampler", 0], vae: ["vae", 0]}
                 },
                 :hires_latent_scaler => %{
                   class_type: "LatentUpscale",
                   inputs: %{
                     crop: "disabled",
                     height: 1536,
                     samples: ["sampler", 0],
                     upscale_method: "nearest-exact",
                     width: 1024
                   }
                 },
                 :hires_sampler => %{
                   class_type: "KSampler",
                   inputs: %{
                     cfg: 7,
                     denoise: 0.5,
                     latent_image: ["second_pass_vae_encode", 0],
                     model: ["positive_lora1", 0],
                     negative: ["cn0_apply_controlnet", 1],
                     positive: ["cn0_apply_controlnet", 0],
                     sampler_name: "euler",
                     scheduler: "karras",
                     seed: 1,
                     steps: 20
                   }
                 },
                 :model => %{
                   class_type: "CheckpointLoaderSimple",
                   inputs: %{ckpt_name: "model_name"}
                 },
                 :negative_prompt => %{
                   class_type: "CLIPTextEncode",
                   inputs: %{
                     clip: ["positive_lora1", 1],
                     text: "neg prompt"
                   }
                 },
                 :output => %{
                   class_type: "Base64ImageOutput",
                   inputs: %{images: ["vae_decode", 0]}
                 },
                 :positive_prompt => %{
                   class_type: "CLIPTextEncode",
                   inputs: %{
                     clip: ["positive_lora1", 1],
                     text: "pos prompt"
                   }
                 },
                 :sampler => %{
                   class_type: "KSampler",
                   inputs: %{
                     cfg: 7,
                     denoise: 1,
                     latent_image: ["empty_latent_image", 0],
                     model: ["positive_lora1", 0],
                     negative: ["cn0_apply_controlnet", 1],
                     positive: ["cn0_apply_controlnet", 0],
                     sampler_name: "euler",
                     scheduler: "karras",
                     seed: 1,
                     steps: 20
                   }
                 },
                 :scaler => %{
                   class_type: "ImageScale",
                   inputs: %{
                     crop: "disabled",
                     height: 1536,
                     image: ["upscale_with_model", 0],
                     upscale_method: "lanczos",
                     width: 1024
                   }
                 },
                 :second_pass_vae_encode => %{
                   class_type: "VAEEncode",
                   inputs: %{pixels: ["scaler", 0], vae: ["vae", 0]}
                 },
                 :upscale_with_model => %{
                   class_type: "ImageUpscaleWithModel",
                   inputs: %{
                     image: ["first_pass_vae_decode", 0],
                     upscale_model: ["upscaler", 0]
                   }
                 },
                 :upscaler => %{
                   class_type: "UpscaleModelLoader",
                   inputs: %{model_name: nil}
                 },
                 :vae => %{
                   class_type: "VAELoader",
                   inputs: %{vae_name: "vae_name"}
                 },
                 :vae_decode => %{
                   class_type: "VAEDecode",
                   inputs: %{samples: ["sampler", 0], vae: ["vae", 0]}
                 },
                 "positive_lora0" => %{
                   class_type: "LoraLoader",
                   inputs: %{
                     clip: ["model", 1],
                     lora_name: "lora1.safetensors",
                     model: ["model", 0],
                     strength_clip: 1,
                     strength_model: 1
                   }
                 },
                 "positive_lora1" => %{
                   class_type: "LoraLoader",
                   inputs: %{
                     clip: ["positive_lora0", 1],
                     lora_name: "lora2.safetensors",
                     model: ["positive_lora0", 0],
                     strength_clip: 0.2,
                     strength_model: 0.2
                   }
                 },
                 :cn0_apply_controlnet => %{
                   class_type: "ControlNetApplyAdvanced",
                   inputs: %{
                     positive: ["positive_prompt", 0],
                     image: ["cn0_preprocessor", 0],
                     control_net: ["cn0_controlnet_loader", 0],
                     end_percent: 1.0,
                     negative: ["negative_prompt", 0],
                     start_percent: 0.0,
                     strength: 1.0
                   }
                 },
                 :cn0_controlnet_loader => %{
                   class_type: "ControlNetLoader",
                   inputs: %{control_net_name: "model1"}
                 },
                 :cn0_image => %{class_type: "Base64ImageInput", inputs: %{bas64_image: ""}},
                 :cn0_preprocessor => %{
                   class_type: "AIO_Preprocessor",
                   inputs: %{image: ["cn0_image", 0], preprocessor: "module1"}
                 }
               }
             }
  end
end
