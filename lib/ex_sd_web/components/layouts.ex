defmodule ExSdWeb.Layouts do
  use ExSdWeb, :html

  embed_templates "layouts/*"

  # remember value at compile time
  @env Mix.env()
  def dev_env?, do: @env == :dev
end
