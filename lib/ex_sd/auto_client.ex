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
    case Tesla.get(client, "/progress") do
      {:ok, %{body: body} = _response} ->
        {:ok, body}

      res ->
        handle_error(res)
    end
  end

  def post_active_model(client, model_title) do
    case Tesla.post(client, "/options", %{sd_model_checkpoint: model_title}) do
      {:ok, %{body: body} = _response} ->
        Logger.info(body)
        {:ok, body}

      res ->
        handle_error(res)
    end
  end

  def get_memory_usage(client) do
    case Tesla.get(client, "/memory") do
      {:ok, %{body: body} = _response} ->
        {:ok, body}

      res ->
        handle_error(res)
    end
  end

  def get_samplers(client) do
    with {:ok, %{body: body}} <- Tesla.get(client, "/samplers"),
         # FIXME: if for some reason body doesn't have "name", it will raise an error
         samplers_names <- body |> Enum.map(& &1["name"]) do
      {:ok, samplers_names}
    else
      res ->
        handle_error(res)
    end
  end

  def get_controlnet_models(client) do
    case Tesla.get(client, "#{@base_url}/controlnet/model_list") do
      {:ok, %{body: body} = _response} ->
        {:ok, body["model_list"]}

      res ->
        handle_error(res)
    end
  end

  def get_controlnet_modules(client) do
    case Tesla.get(client, "#{@base_url}/controlnet/module_list") do
      {:ok, %{body: body} = _response} ->
        # FIXME: fail gracefully if attribute is not present in body
        modules =
          body["module_list"]
          |> Enum.sort()
          |> Enum.filter(&(&1 !== "none"))
          |> List.insert_at(0, "none")

        {:ok, modules, body["module_detail"]}

      res ->
        handle_error(res)
    end
  end

  @spec controlnet_detect(binary | Tesla.Client.t(), any) :: {:error, any} | {:ok, list}
  def controlnet_detect(client, params) do
    case Tesla.post(client, "#{@base_url}/controlnet/detect", params) do
      {:ok, %{body: body, status: status} = _response} when status != 500 ->
        # response |> IO.inspect()
        {:ok, body["images"] |> Enum.map(&"data:image/png;base64,#{&1}")}

      res ->
        handle_error(res)
    end
  end

  def get_models(client) do
    case Tesla.get(client, "/sd-models") do
      {:ok, %{body: body} = _response} ->
        {:ok, body}

      res ->
        handle_error(res)
    end
  end

  def refresh_models(client) do
    case Tesla.post(client, "/refresh-checkpoints", %{}) do
      {:ok, %{body: body} = _response} ->
        {:ok, body}

      res ->
        handle_error(res)
    end
  end

  def get_upscalers(client) do
    case Tesla.get(client, "/upscalers") do
      {:ok, %{body: body} = _response} ->
        {:ok, body}

      res ->
        handle_error(res)
    end
  end

  def get_loras(client) do
    case Tesla.get(client, "/loras") do
      {:ok, %{body: body} = _response} ->
        {:ok, body}

      res ->
        handle_error(res)
    end
  end

  def get_embeddings(client) do
    case Tesla.get(client, "/embeddings") do
      {:ok, %{body: body} = _response} ->
        {:ok, body}

      res ->
        handle_error(res)
    end
  end

  def get_options(client) do
    case Tesla.get(client, "/options") do
      {:ok, %{body: body} = _response} ->
        {:ok, body}

      res ->
        handle_error(res)
    end
  end

  def get_png_info(client, png_data_url) do
    case Tesla.post(client, "/png-info", %{image: png_data_url}) do
      {:ok, %{body: body} = _response} ->
        {:ok, body}

      res ->
        handle_error(res)
    end
  end

  def get_scripts(client) do
    case Tesla.get(client, "/scripts") do
      {:ok, %{body: body} = _response} ->
        {:ok, body}

      res ->
        handle_error(res)
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

  defp handle_error(resp) do
    case resp do
      {:error, error} ->
        # Logger.error(%{network_error: error})
        {:error, error}

      {:ok, res} ->
        {:error, res.body}

      res ->
        Logger.error(res)
        {:error, res.body}
    end
  end
end
