defmodule ExSd.CivitClient do
  alias ExSd.Civit
  require Logger

  def interrupt() do
    {:ok, _response} = post("/interrupt", %{})
  end

  @spec get_model_by_hash(binary()) :: {:error, any()} | {:ok, map()}
  def get_model_by_hash(hash) do
    with response <- get("/model-versions/by-hash/#{hash}"),
         {:ok, body} <- handle_response(response) do
      {:ok, body}
    else
      {:error, _error} = res ->
        res
    end
  end

  @spec get_model_by_name(binary(), [
          {:limit, non_neg_integer()} | {:types, list(:Checkpoint | :LORA)}
        ]) ::
          {:error, binary() | map()} | {:ok, binary()}
  def get_model_by_name(name, options \\ []) do
    Logger.info("Civit: Fetching models with id #{name}")

    with response <-
           get(
             URI.parse("/models")
             |> maybe_append_query("query", name)
             |> maybe_append_query("limit", Keyword.get(options, :limit))
             |> maybe_append_query("types", Keyword.get(options, :types))
             |> URI.to_string(),
             timeout: 10_000
           ),
         {:ok, body} <- handle_response(response) do
      {:ok, body}
    else
      {:error, _error} = res ->
        res
    end
  end

  @spec get_model_by_id(binary()) ::
          {:error, binary() | map()} | {:ok, map()}
  def get_model_by_id(id) do
    Logger.info("Civit: Fetching model with id #{id}")

    with response <-
           get(
             URI.parse("/models/#{id}")
             |> URI.to_string(),
             timeout: 10_000
           ),
         {:ok, body} <- handle_response(response) do
      {:ok, body}
    else
      {:error, _error} = res ->
        res
    end
  end

  @spec get_tags(binary() | nil) :: {:error, binary() | map()} | {:ok, binary()}
  def get_tags(name \\ nil) do
    with response <-
           get(
             URI.parse("/tags")
             |> maybe_append_query("query", name)
             |> maybe_append_query("limit", 15)
             |> URI.to_string(),
             timeout: 10_000
           ),
         {:ok, body} <- handle_response(response) do
      {:ok, body}
    else
      {:error, _error} = res ->
        res
    end
  end

  @spec get(binary(), [{:base_url, binary()} | {:timeout, non_neg_integer()}]) ::
          {:error, %{:__exception__ => true, :__struct__ => atom(), optional(atom()) => any()}}
          | {:ok, Finch.Response.t()}
  def get(url, options \\ []) do
    base_url = Keyword.get(options, :base_url, get_base_url())
    timeout = Keyword.get(options, :timeout, 4_000)

    token = Civit.get_civit_token()

    case Finch.build(
           :get,
           "#{base_url}#{url}",
           if(is_nil(token),
             do: [],
             else: [
               {"Authorization", "Bearer #{token}"}
             ]
           )
         )
         |> Finch.request(ExSd.Finch, receive_timeout: timeout) do
      {:ok, response} ->
        {:ok, %{response | body: Jason.decode!(response.body)}}

      response ->
        response
    end
  end

  @spec post(binary(), map(), [{:base_url, binary()} | {:timeout, non_neg_integer()}]) ::
          {:error, %{:__exception__ => true, :__struct__ => atom(), optional(atom()) => any()}}
          | {:ok, Finch.Response.t()}
  def post(url, body, options \\ []) do
    base_url = Keyword.get(options, :base_url, "#{get_base_url()}/sdapi/v1")
    timeout = Keyword.get(options, :timeout, 15_000)

    case Finch.build(:post, "#{base_url}#{url}", [], Jason.encode!(body))
         |> Finch.request(ExSd.Finch, receive_timeout: timeout) do
      {:ok, response} -> {:ok, %{response | body: Jason.decode!(response.body)}}
      response -> response
    end
  end

  defp get_base_url() do
    # Application.fetch_env!(:ex_sd, :auto_client_base_url)
    "https://civitai.com/api/v1"
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

  defp maybe_append_query(uri, key, value) when is_nil(key) or is_nil(value) do
    uri
  end

  defp maybe_append_query(uri, key, value) when is_list(value) do
    value
    |> Enum.reduce(uri, fn value_item, acc_uri ->
      acc_uri
      |> maybe_append_query(key, value_item)
    end)
  end

  defp maybe_append_query(uri, key, value) do
    uri
    |> URI.append_query(URI.encode_query(%{key => value}, :rfc3986))
  end
end
