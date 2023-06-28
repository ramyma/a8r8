defmodule ExSd.Sd.ImageService do
  def save("data:image/png;base64," <> _ = data_url, name) do
    data_url_to_upload(data_url, name)
  end

  def save(base64_string_image, name) do
    data_url_to_upload("data:image/png;base64,#{base64_string_image}", name)
  end

  defp data_url_to_upload(data_url, name) do
    with %{scheme: "data"} = uri <- URI.parse(data_url),
         %URL.Data{data: data} <- URL.Data.parse(uri) do
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

  # Creates a mask image that fills the transparent parts with white.
  defp fill_mask!(mask_data_url, image_average, invert_mask) do
    with %{scheme: "data"} = uri <- URI.parse(mask_data_url),
         %URL.Data{data: data} <- URL.Data.parse(uri),
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
            if(Enum.sum(image_average) == 0,
              do:
                image
                |> Image.Draw.flood!(0, 0, color: :white),
              else: image
            )

          # |> Image.write!(:memory, suffix: ".png")
          # |> Base.encode64()

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
         %URL.Data{data: data} <- URL.Data.parse(uri),
         {:ok, image} <- Image.from_binary(data) do
      image
      # |> Image.new!(bands: 4, color: [0, 0, 0, 1], format: {:u, 16})

      # |> Image.Math.multiply!([1.0, 1.0, 1.0, 255.0])
    end
  end

  def image_from_dataurl(binary_image) do
    image_from_dataurl("data:image/png;base64,#{binary_image}")
  end

  def mask_from_alpha(image_data_url, mask_data_url, invert_mask) do
    with %{scheme: "data"} = uri <- URI.parse(image_data_url),
         %URL.Data{data: data} <- URL.Data.parse(uri),
         {:ok, image} <- Image.from_binary(data) do
      mask_from_image =
        image
        |> Image.convert_to_mask!()
        |> Image.dilate!(20)
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

      {"data:image/png;base64,#{mask_binary}", mask}
    end
  end
end
