defmodule ExSdWeb.SdChannel do
  use ExSdWeb, :channel
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
    samplers = Sd.get_samplers()
    {:reply, samplers, socket}
  end

  @impl true
  def handle_in("get_is_connected", _payload, socket) do
    is_connected = Sd.get_is_connected()
    {:reply, is_connected, socket}
  end

  @impl true
  def handle_in("get_models", _payload, socket) do
    models = Sd.get_models()
    {:reply, models, socket}
  end

  @impl true
  def handle_in("get_vaes", _payload, socket) do
    vaes = Sd.get_vaes()
    {:reply, vaes, socket}
  end

  @impl true
  def handle_in("get_schedulers", _payload, socket) do
    schedulers = Sd.get_schedulers()
    {:reply, schedulers, socket}
  end

  @impl true
  def handle_in("get_scripts", _payload, socket) do
    scripts = Sd.get_scripts()
    {:reply, scripts, socket}
  end

  @impl true
  def handle_in("get_upscalers", _payload, socket) do
    upscalers = Sd.get_upscalers()
    {:reply, upscalers, socket}
  end

  @impl true
  def handle_in("get_loras", _payload, socket) do
    loras = Sd.get_loras()
    {:reply, loras, socket}
  end

  @impl true
  def handle_in("get_embeddings", _payload, socket) do
    embeddings = Sd.get_embeddings()
    {:reply, embeddings, socket}
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
    controlnet_models = Sd.get_controlnet_models()
    {:reply, controlnet_models, socket}
  end

  @impl true
  def handle_in("get_controlnet_preprocessors", _payload, socket) do
    controlnet_preprocessors = Sd.get_controlnet_preprocessors()
    {:reply, controlnet_preprocessors, socket}
  end

  @impl true
  def handle_in("get_options", _payload, socket) do
    options = Sd.get_options()
    {:reply, options, socket}
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
  def handle_in("get_selection", image_data_url, socket) do
    selection_mask = Sd.py(image_data_url["image"])
    {:reply, {:ok, selection_mask}, socket}
  end

  # Add authorization logic here as required.
  defp authorized?(_payload) do
    true
  end
end
