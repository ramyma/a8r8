defmodule ExSd.ArrayType do
  use Ecto.Type

  def cast(value) when is_list(value) do
    {:ok, value}
  end

  def cast(_), do: :error
end
