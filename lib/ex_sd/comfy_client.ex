defmodule ExSd.ComfyClient do
  require Logger

  alias ExSd.Sd.{GenerationParams, ComfyPrompt}

  @spec generate_image(GenerationParams.t(), map(), any()) ::
          {:error, binary() | map()} | {:ok, binary()}
  def generate_image(%GenerationParams{txt2img: true} = generation_params, attrs, client_id) do
    Logger.info("Generating txt2img")
    Logger.debug(%{attrs: attrs})

    generation_params
    |> Map.delete(:mask)
    |> Map.delete(:init_images)
    |> Logger.info()

    generation_params =
      ComfyPrompt.txt2img(generation_params, attrs)
      |> Map.merge(%{client_id: client_id})

    with {:ok, response} <-
           post(
             "/prompt",
             generation_params
           ),
         %{status: 200, body: body} <- response do
      {:ok, body}
    else
      res -> handle_error(res)
    end
  end

  def generate_image(%GenerationParams{txt2img: false} = generation_params, attrs, client_id) do
    Logger.info("Generating img2img")
    Logger.debug(generation_params)
    Logger.debug(attrs)

    generation_params =
      ComfyPrompt.img2img(generation_params, attrs)
      |> Map.merge(%{client_id: client_id})

    with {:ok, response} <-
           post(
             "/prompt",
             generation_params
           ),
         %{status: 200, body: body} <- response do
      {:ok, body}
    else
      res -> handle_error(res)
    end
  end

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
end
