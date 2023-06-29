defmodule ExSd.AutoClient do
  require Logger

  alias ExSd.Sd.GenerationParams

  @base_url Application.compile_env!(:ex_sd, :auto_client_base_url)

  def generate_image(
        client,
        %GenerationParams{txt2img: true} = generation_params
      ) do
    Logger.info("BASEURL:  " <> @base_url)
    Logger.info("Generating txt2img")

    generation_params
    |> Map.delete(:mask)
    |> Map.delete(:init_images)
    |> Logger.info()

    with {:ok, response} <-
           Tesla.post(
             client,
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

  @spec generate_image(binary | Tesla.Client.t(), GenerationParams.t()) :: any
  def generate_image(
        client,
        generation_params
      ) do
    Logger.info("Generating img2img")

    Logger.info(
      generation_params
      |> Map.delete(:mask)
      |> Map.delete(:init_images)
    )

    with {:ok, response} <-
           Tesla.post(
             client,
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

  def interrupt(client) do
    {:ok, _response} = Tesla.post(client, "/interrupt", %{})
  end

  def get_progress(client) do
    with response <- Tesla.get(client, "/progress"),
         {:ok, body} <- handle_response(response) do
      {:ok, body}
    else
      {:error, _error} = res ->
        res
    end
  end

  def post_active_model(client, model_title) do
    with response <- Tesla.post(client, "/options", %{sd_model_checkpoint: model_title}),
         {:ok, body} <- handle_response(response) do
      Logger.info(body)
      {:ok, body}
    else
      {:error, _error} = res ->
        res
    end
  end

  def get_memory_usage(client) do
    with response <- Tesla.get(client, "/memory"),
         {:ok, body} <- handle_response(response) do
      {:ok, body}
    else
      {:error, _error} = res ->
        res
    end
  end

  def get_samplers(client) do
    with response <- Tesla.get(client, "/samplers"),
         {:ok, body} <- handle_response(response) do
      # TODO: if for some reason body doesn't have "name", it will raise an error
      samplers_names = body |> Enum.map(& &1["name"])

      {:ok, samplers_names}
    else
      {:error, _error} = res ->
        res
    end
  end

  def get_controlnet_models(client) do
    with response <- Tesla.get(client, "#{@base_url}/controlnet/model_list"),
         {:ok, body} <- handle_response(response) do
      {:ok, body["model_list"]}
    else
      {:error, _error} = res ->
        res
    end
  end

  def get_controlnet_modules(client) do
    with response <- Tesla.get(client, "#{@base_url}/controlnet/module_list"),
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

  @spec controlnet_detect(binary | Tesla.Client.t(), any) :: {:error, any} | {:ok, list}
  def controlnet_detect(client, params) do
    with response <- Tesla.post(client, "#{@base_url}/controlnet/detect", params),
         {:ok, body} <- handle_response(response) do
      {:ok, body["images"] |> Enum.map(&"data:image/png;base64,#{&1}")}
    else
      {:error, _error} = res ->
        res
    end
  end

  def get_models(client) do
    with response <- Tesla.get(client, "/sd-models"),
         {:ok, body} <- handle_response(response) do
      {:ok, body}
    else
      {:error, _error} = res ->
        res
    end
  end

  def refresh_models(client) do
    with response <- Tesla.post(client, "/refresh-checkpoints", %{}),
         {:ok, body} <- handle_response(response) do
      {:ok, body}
    else
      {:error, _error} = res ->
        res
    end
  end

  def get_upscalers(client) do
    with response <- Tesla.get(client, "/upscalers"),
         {:ok, body} <- handle_response(response) do
      {:ok, body}
    else
      {:error, _error} = res ->
        res
    end
  end

  def get_loras(client) do
    with response <- Tesla.get(client, "/loras"),
         {:ok, body} <- handle_response(response) do
      {:ok, body}
    else
      {:error, _error} = res ->
        res
    end
  end

  def get_embeddings(client) do
    with response <- Tesla.get(client, "/embeddings"),
         {:ok, body} <- handle_response(response) do
      {:ok, body}
    else
      {:error, _error} = res ->
        res
    end
  end

  def get_options(client) do
    with response <- Tesla.get(client, "/options"),
         {:ok, body} <- handle_response(response) do
      {:ok, body}
    else
      {:error, _error} = res ->
        res
    end
  end

  def get_png_info(client, png_data_url) do
    with response <- Tesla.post(client, "/png-info", %{image: png_data_url}),
         {:ok, body} <- handle_response(response) do
      {:ok, body}
    else
      {:error, _error} = res ->
        res
    end
  end

  def get_scripts(client) do
    with response <- Tesla.get(client, "/scripts"),
         {:ok, body} <- handle_response(response) do
      {:ok, body}
    else
      {:error, _error} = res ->
        res
    end
  end

  # build dynamic client based on runtime arguments
  def client() do
    middleware = [
      {Tesla.Middleware.BaseUrl, "#{@base_url}/sdapi/v1"},
      Tesla.Middleware.JSON,
      {Tesla.Middleware.Timeout, timeout: 10_000_000}
      # {Tesla.Middleware.Headers, [{"authorization", "token: " <> token }]}
    ]

    Tesla.client(middleware)
  end

  defp handle_response(resp) do
    case resp do
      {:ok, %Tesla.Env{body: body, status: status}} when status >= 200 and status < 400 ->
        {:ok, body}

      _ ->
        handle_error(resp)
    end
  end

  defp handle_error(resp) do
    case resp do
      {:error, error} ->
        # Logger.error(%{network_error: error})
        {:error, error}

      {:ok, %Tesla.Env{body: %{"detail" => "Not Found"}, status: 404}} ->
        {:error, "Not Found"}

      {:ok, %Tesla.Env{status: status} = res} when status >= 400 ->
        {:error, res.body}

      {:ok, res} ->
        {:error, res.body}

      res ->
        Logger.error(res)
        {:error, res.body}
    end
  end
end
