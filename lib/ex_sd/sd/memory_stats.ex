defmodule ExSd.Sd.MemoryStats do
  @derive {Jason.Encoder, except: []}
  defstruct ram_usage: 0, cuda_usage: 0
end
