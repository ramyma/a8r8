defmodule ExSd.Sd.ImageService do
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
  @spec fill_mask!(binary() | URI.t(), any(), any(), [{:mask_blur, non_neg_integer()}]) ::
          {:error, any()}
          | Vix.Vips.Image.t()
  @spec fill_mask!(binary() | URI.t(), any(), any()) :: {:error, any()} | Vix.Vips.Image.t()
  def fill_mask!(mask_data_url, image_average, invert_mask, options \\ []) do
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
          # mask_blur = Keyword.get(options, :mask_blur, 6)
          # Fill whole mask with white if the average of all pixels is 0; meaning an empty mask
          mask =
            if Enum.sum(image_average) == 0 do
              image
              |> Image.Draw.flood!(0, 0, color: :white)

              # TODO: control using attrs
              # |> maybe_feather!(20.0, Keyword.get(options, :should_feather_mask, true))

              # |> Image.feather!(sigma: mask_blur)

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
          # |> Image.feather!(sigma: 15)
          mask_blur = Keyword.get(options, :mask_blur, 6)

          if mask_blur && mask_blur != 0 do
            image |> Image.blur!(sigma: mask_blur, min_amplitude: 0.001)
          else
            image
          end
      end
    end
  end

  @spec flood_alpha_with_color(Vix.Vips.Image.t(), binary() | nil) :: Vix.Vips.Image.t()
  def flood_alpha_with_color(image, color \\ "white") do
    Image.compose!(
      Image.Draw.flood!(Image.new!(Image.width(image), Image.height(image)), 0, 0, color: color),
      image
    )
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

  @spec base64_from_image(nil | Vix.Vips.Image.t()) :: nil | binary()
  def base64_from_image(image) when is_nil(image) do
    image
  end

  def base64_from_image(image) do
    image
    |> Image.write!(:memory, suffix: ".png")
    |> Base.encode64()
  end

  @spec mask_from_alpha(binary() | URI.t(), any(), any(), [{:mask_blur, non_neg_integer()}]) ::
          {:error, {:error, any()} | URI.t()} | {:ok, <<_::64, _::_*8>>, Vix.Vips.Image.t()}
  def mask_from_alpha(image_data_url, mask_data_url, invert_mask, options \\ []) do
    with %{scheme: "data"} = uri <- URI.parse(image_data_url),
         {:ok, %URL.Data{data: data}} <- URL.Data.parse(uri),
         {:ok, image} <- Image.from_binary(data) do
      blur = Keyword.get(options, :mask_blur, 10)

      mask_from_image =
        image
        |> Image.convert_alpha_to_mask!()
        # TODO: check it doesn't crash the application with values > 10

        |> then(
          &if(blur > 0,
            do: &1 |> grow!() |> Image.blur!(sigma: blur, min_amplitude: 0.001),
            else: &1
          )
        )

      # |> Image.Draw.flood!(0, 0, color: :white)

      {:ok, mask} =
        mask_from_image
        |> Image.Math.add(
          fill_mask!(mask_data_url, Image.average!(mask_from_image), invert_mask,
            mask_blur: Keyword.get(options, :mask_blur)
          )
        )

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

  @spec grow!(Vix.Vips.Image.t()) :: Vix.Vips.Image.t()
  def grow!(image) do
    {:ok, grow_kernel} =
      Vix.Vips.Image.new_from_list([
        [1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1]
      ])

    Enum.reduce(1..30, image, fn _, acc ->
      Vix.Vips.Operation.convi!(acc, grow_kernel)
    end)
  end
end
