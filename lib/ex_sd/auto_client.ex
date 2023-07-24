defmodule ExSd.AutoClient do
  require Logger

  alias ExSd.Sd.GenerationParams

  def generate_image(%GenerationParams{txt2img: true} = generation_params) do
    Logger.info("Generating txt2img")

    generation_params
    |> Map.delete(:mask)
    |> Map.delete(:init_images)
    |> Logger.info()

    with {:ok, response} <-
           post(
             "/txt2img",
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
    with response <- get("/progress"),
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

  def get_memory_usage() do
    with response <- get("/memory"),
         {:ok, body} <- handle_response(response) do
      {:ok, body}
    else
      {:error, _error} = res ->
        res
    end
  end

  def get_samplers() do
    with response <- get("/samplers"),
         {:ok, body} <- handle_response(response) do
      # TODO: if for some reason body doesn't have "name", it will raise an error
      samplers_names = body |> Enum.map(& &1["name"])

      {:ok, samplers_names}
    else
      {:error, _error} = res ->
        res
    end
  end

  def get_controlnet_models() do
    with response <- get("/model_list", "#{get_base_url()}/controlnet"),
         {:ok, body} <- handle_response(response) do
      {:ok, body["model_list"]}
    else
      {:error, _error} = res ->
        res
    end
  end

  def get_controlnet_modules() do
    with response <- get("/module_list", "#{get_base_url()}/controlnet"),
         {:ok, body} <- handle_response(response) do
      # TODO: fail gracefully if attribute is not present in body
      modules =
        body["module_list"]
        |> Enum.sort()
        |> Enum.filter(&(&1 !== "none"))
        |> List.insert_at(0, "none")

      {:ok, modules, body["module_detail"]}
    else
      {:error, _error} = res ->
        res
    end
  end

  @spec controlnet_detect(any) :: {:error, any} | {:ok, list}
  def controlnet_detect(params) do
    with response <- post("/detect", params, "#{get_base_url()}/controlnet"),
         {:ok, body} <- handle_response(response) do
      {:ok, body["images"] |> Enum.map(&"data:image/png;base64,#{&1}")}
    else
      {:error, _error} = res ->
        res
    end
  end

  def get_models() do
    with response <- get("/sd-models"),
         {:ok, body} <- handle_response(response) do
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
    with response <- get("/upscalers"),
         {:ok, body} <- handle_response(response) do
      {:ok, body}
    else
      {:error, _error} = res ->
        res
    end
  end

  def get_loras() do
    with response <- get("/loras"),
         {:ok, body} <- handle_response(response) do
      {:ok, body}
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
  def get(url, base_url \\ "#{get_base_url()}/sdapi/v1") do
    case Finch.build(:get, "#{base_url}#{url}")
         |> Finch.request(ExSd.Finch, receive_timeout: 1_000_000) do
      {:ok, response} -> {:ok, %{response | body: Jason.decode!(response.body)}}
      response -> response
    end
  end

  def post(url, body, base_url \\ "#{get_base_url()}/sdapi/v1") do
    case Finch.build(:post, "#{base_url}#{url}", [], Jason.encode!(body))
         |> Finch.request(ExSd.Finch, receive_timeout: 1_000_000) do
      {:ok, response} -> {:ok, %{response | body: Jason.decode!(response.body)}}
      response -> response
    end
  end

  defp get_base_url() do
    Application.fetch_env!(:ex_sd, :auto_client_base_url)
  end
end
