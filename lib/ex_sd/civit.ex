defmodule ExSd.Civit do
  alias ExSd.CivitaiClient
  defdelegate get_model_by_hash(hash), to: CivitaiClient
end
