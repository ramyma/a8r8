defmodule ExSdWeb.SdChannel do
  use ExSdWeb, :channel
  alias ExSd.ConfigManager
  alias ExSd.Sd
  # @impl true
  # def join("sd:lobby", payload, socket) do
  #   if authorized?(payload) do
  #     {:ok, socket}
  #   else
  #     {:error, %{reason: "unauthorized"}}
  #   end
  # end

  @impl true
  def join("sd", _payload, socket) do
    {:ok, socket}
  end

  @impl true
  def handle_in(
        "generate",
        %{"image" => image, "attrs" => attrs, "session_name" => session_name},
        socket
      ) do
    Sd.generate(image, attrs, session_name)
    {:noreply, socket}
  end

  @impl true
  def handle_in("interrupt", _, socket) do
    Sd.interrupt()
    {:noreply, socket}
  end

  @impl true
  def handle_in("get_samplers", _payload, socket) do
    Sd.get_samplers()
    {:noreply, socket}
  end

  @impl true
  def handle_in("get_is_connected", _payload, socket) do
    is_connected = Sd.get_is_connected()
    {:reply, is_connected, socket}
  end

  @impl true
  def handle_in("get_models", _payload, socket) do
    Sd.get_models()
    {:noreply, socket}
  end

  @impl true
  def handle_in("get_unets", _payload, socket) do
    Sd.get_unets()
    {:noreply, socket}
  end

  @impl true
  def handle_in("get_clip_models", _payload, socket) do
    Sd.get_clip_models()
    {:noreply, socket}
  end

  @impl true
  def handle_in("get_vaes", _payload, socket) do
    Sd.get_vaes()
    {:noreply, socket}
  end

  @impl true
  def handle_in("get_schedulers", _payload, socket) do
    Sd.get_schedulers()
    {:noreply, socket}
  end

  @impl true
  def handle_in("get_scripts", _payload, socket) do
    Sd.get_scripts()
    {:noreply, socket}
  end

  @impl true
  def handle_in("get_upscalers", _payload, socket) do
    Sd.get_upscalers()
    {:noreply, socket}
  end

  @impl true
  def handle_in("get_loras", _payload, socket) do
    Sd.get_loras()
    {:noreply, socket}
  end

  @impl true
  def handle_in("get_embeddings", _payload, socket) do
    Sd.get_embeddings()
    {:noreply, socket}
  end

  @impl true
  def handle_in("get_backend", _payload, socket) do
    backend = Sd.get_backend()
    {:reply, backend, socket}
  end

  @impl true
  def handle_in("get_memory", _payload, socket) do
    Sd.get_memory_usage()
    {:noreply, socket}
  end

  @impl true
  def handle_in("get_controlnet_models", _payload, socket) do
    Sd.get_controlnet_models()
    {:noreply, socket}
  end

  @impl true
  def handle_in("get_controlnet_preprocessors", _payload, socket) do
    Sd.get_controlnet_preprocessors()
    {:noreply, socket}
  end

  @impl true
  def handle_in("get_union_controlnet_types", _payload, socket) do
    Sd.get_union_controlnet_types()
    {:noreply, socket}
  end

  @impl true
  def handle_in("get_ip_adapter_models", _payload, socket) do
    Sd.get_ip_adapter_models()
    {:noreply, socket}
  end

  @impl true
  def handle_in("get_options", _payload, socket) do
    Sd.get_options()
    {:noreply, socket}
  end

  @impl true
  def handle_in("set_model", model_title, socket) do
    Sd.set_model(model_title)
    {:noreply, socket}
  end

  @impl true
  def handle_in("set_vae", vae, socket) do
    Sd.set_vae(vae)
    {:noreply, socket}
  end

  @impl true
  def handle_in("set_backend", backend, socket) do
    Sd.set_backend(backend)
    {:noreply, socket}
  end

  @impl true
  def handle_in("get_png_info", png_data_url, socket) do
    {:ok, png_info} = Sd.get_png_info(png_data_url)
    {:reply, png_info, socket}
  end

  @impl true
  def handle_in("controlnet_detect", params, socket) do
    Sd.controlnet_detect(params)
    {:noreply, socket}
  end

  @impl true
  def handle_in("get_config", _payload, socket) do
    config = ConfigManager.get_config()
    {:reply, {:ok, config}, socket}
  end

  # @impl true
  # def handle_in("get_selection", image_data_url, socket) do
  #   selection_mask = Sd.py(image_data_url["image"])
  #   {:reply, {:ok, selection_mask}, socket}
  # end

  # # Add authorization logic here as required.
  # defp authorized?(_payload) do
  #   true
  # end
end
