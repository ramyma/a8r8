defmodule ExSdWeb.CivitChannel do
  use ExSdWeb, :channel

  @impl true
  def join("civit", _payload, socket) do
    {:ok, socket}
  end

  @impl true
  def handle_in("civit_get_model_by_hash", hash, socket) do
    model_resp = ExSd.Civit.get_model_by_hash(hash) |> IO.inspect()
    {:reply, model_resp, socket}
  end
end
