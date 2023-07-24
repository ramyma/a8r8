defmodule ExSd.Sd.ControlNet do
  use Ecto.Schema
  import Ecto.Changeset
  alias ExSd.Sd.ControlNetArgs

  @derive {Jason.Encoder, except: []}
  @type t :: %__MODULE__{
          args: list()
        }
  # @type t :: %__MODULE__{
  #         mask: String.t(),
  #         comments: [MyApp.Comment.t()]
  #       }
  @primary_key false
  embedded_schema do
    embeds_many :args, ControlNetArgs
  end

  def changeset(%__MODULE__{} = control_net, attrs) do
    control_net
    |> cast(
      attrs,
      []
    )
    |> cast_embed(:args)
  end
end
