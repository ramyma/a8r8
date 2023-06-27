defmodule ExSdWeb.RoomChannel do
  use Phoenix.Channel
  alias ExSdWeb.Presence

  @impl true
  def join("room:lobby", %{"name" => name}, socket) do
    send(self(), :after_join)
    {:ok, assign(socket, :name, name)}
  end

  @impl true
  def handle_info(:after_join, socket) do
    {:ok, _} =
      Presence.track(socket, socket.assigns.name, %{
        online_at: inspect(System.system_time(:second)),
        selection_box: %{}
      })

    push(socket, "presence_state", Presence.list(socket))
    {:noreply, socket}
  end

  @impl true
  def handle_in("update_selection_box", payload, %{assigns: %{name: name}} = socket) do
    Presence.update(socket, name, fn existing_meta ->
      new_selection_box = Map.merge(existing_meta.selection_box, payload)
      Map.put(existing_meta, :selection_box, new_selection_box)
    end)

    # push(socket, "presence_state", Presence.list(socket))
    {:noreply, socket}
  end
end
