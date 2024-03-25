defmodule ExSd.Sd.ImageService do
  alias ExSd.Sd.ImageService

  def save("data:image/png;base64," <> _ = data_url, name) do
    data_url_to_upload(data_url, name)
  end

  def save("data:image/jpeg;base64," <> _ = data_url, name) do
    data_url_to_upload(data_url, name)
  end

  def save(base64_string_image, name) do
    data_url_to_upload("data:image/png;base64,#{base64_string_image}", name)
  end

  defp data_url_to_upload(data_url, name) do
    with %{scheme: "data"} = uri <- URI.parse(data_url),
         {:ok, %URL.Data{data: data}} <- URL.Data.parse(uri) do
      binary_to_upload(data, name)
    end
  end

  defp binary_to_upload(binary, name) do
    with {:ok, path} <- Plug.Upload.random_file(name),
         {:ok, file} <- File.open(path, [:write, :binary]),
         :ok <- IO.binwrite(file, binary),
         :ok <- File.close(file) do
      %Plug.Upload{path: path}
    end
  end

  defp maybe_feather!(image, sigma, true = _condition) do
    Image.feather!(image, sigma: sigma)
  end

  defp maybe_feather!(image, _sigma, _condition) do
    image
  end

  # Creates a mask image that fills the transparent parts with white.
  # , options \\ []) do
  def fill_mask!(mask_data_url, image_average, invert_mask) do
    with %{scheme: "data"} = uri <- URI.parse(mask_data_url),
         {:ok, %URL.Data{data: data}} <- URL.Data.parse(uri),
         {:ok, image} <- Image.from_binary(data),
         average <- Image.average(image) do
      image =
        if(invert_mask,
          do:
            image
            |> Vix.Vips.Operation.invert!(),
          else: image
        )

      case Enum.sum(average) do
        0 ->
          # Fill whole mask with white if the average of all pixels is 0; meaning an empty mask
          mask =
            if Enum.sum(image_average) == 0 do
              image
              |> Image.Draw.flood!(0, 0, color: :white)

              # TODO: control using attrs
              # |> maybe_feather!(20.0, Keyword.get(options, :should_feather_mask, true)),
              # |> Image.feather!(sigma: 15)

              # Image.compose!(
              #   image,
              #   Image.Draw.flood!(image, 0, 0, color: :black),
              #   blend_mode: :out
              # )
            else
              image
            end

          # mask
          # |> Image.write!(:memory, suffix: ".png")
          # |> Base.encode64()
          # |> ImageService.save("MMMMASK")

          mask

        # "data:image/png;base64,#{mask}"

        # data_url_to_upload("data:image/png;base64,#{mask}")

        _ ->
          # blur the image mask if it's not an empty mask
          # TODO: control mask blur dynamically
          image
          |> Image.blur!(sigma: 6)
      end
    end
  end

  def image_from_dataurl("data:image/png;base64," <> _binary = dataurl_image) do
    with %{scheme: "data"} = uri <- URI.parse(dataurl_image),
         {:ok, %URL.Data{data: data}} <- URL.Data.parse(uri),
         {:ok, image} <- Image.from_binary(data) do
      image
      # |> Image.new!(bands: 4, color: [0, 0, 0, 1], format: {:u, 16})

      # |> Image.Math.multiply!([1.0, 1.0, 1.0, 255.0])
    end
  end

  def image_from_dataurl(binary_image) do
    image_from_dataurl("data:image/png;base64,#{binary_image}")
  end

  @spec mask_from_alpha(binary() | URI.t(), any(), any()) ::
          {:error, {:error, any()} | URI.t()} | {:ok, <<_::64, _::_*8>>, Vix.Vips.Image.t()}
  def mask_from_alpha(image_data_url, mask_data_url, invert_mask) do
    with %{scheme: "data"} = uri <- URI.parse(image_data_url),
         {:ok, %URL.Data{data: data}} <- URL.Data.parse(uri),
         {:ok, image} <- Image.from_binary(data) do
      mask_from_image =
        image
        |> Image.convert_alpha_to_mask!()
        # TODO: check it doesn't crash the application with values > 10
        |> Image.dilate!(40)
        |> Image.blur!(sigma: 10.0)

      # |> Image.Draw.flood!(0, 0, color: :white)

      {:ok, mask} =
        mask_from_image
        |> Image.Math.add(fill_mask!(mask_data_url, Image.average!(mask_from_image), invert_mask))

      mask_binary =
        mask
        |> Image.write!(:memory, suffix: ".png")
        |> Base.encode64()

      save(mask_binary, "mask")

      {:ok, "data:image/png;base64,#{mask_binary}", mask}
    else
      error -> {:error, error}
    end
  end
end
