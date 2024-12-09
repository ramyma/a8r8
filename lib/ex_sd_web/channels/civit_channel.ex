defmodule ExSdWeb.CivitChannel do
  use ExSdWeb, :channel

  @impl true
  def join("civit", _payload, socket) do
    {:ok, socket}
  end

  @impl true
  def handle_in("civit_get_model_by_hash", %{"hash" => hash, "path" => path}, socket) do
    model_resp = ExSd.Civit.get_model_by_hash(hash, path)
    {:reply, model_resp, socket}
  end

  @impl true
  def handle_in("civit_store_config", civit_config, socket) do
    ExSd.Civit.store_config(civit_config)
    {:noreply, socket}
  end
end
