defmodule Helloworld.HelloRequest do
  @moduledoc false

  use Protobuf, syntax: :proto3, protoc_gen_elixir_version: "0.12.0"

  field :name, 1, type: :string
end

defmodule Helloworld.HelloReply do
  @moduledoc false

  use Protobuf, syntax: :proto3, protoc_gen_elixir_version: "0.12.0"

  field :message, 1, type: :string
  field :result, 2, type: :string
end

defmodule Helloworld.NestedList do
  @moduledoc false

  use Protobuf, syntax: :proto3, protoc_gen_elixir_version: "0.12.0"

  field :result, 1, repeated: true, type: :bool
end

defmodule Helloworld.ProcessRequest do
  @moduledoc false

  use Protobuf, syntax: :proto3, protoc_gen_elixir_version: "0.12.0"

  field :image, 1, type: :string
  field :prompt, 2, type: Helloworld.FastSamPrompt
end

defmodule Helloworld.FastSamPrompt do
  @moduledoc false

  use Protobuf, syntax: :proto3, protoc_gen_elixir_version: "0.12.0"

  field :point_prompt, 1, type: :string, json_name: "pointPrompt"
  field :box_prompt, 2, type: :string, json_name: "boxPrompt"
  field :point_label, 3, type: :string, json_name: "pointLabel"
  field :text_prompt, 4, type: :string, json_name: "textPrompt"
end

defmodule Helloworld.ProcessReply do
  @moduledoc false

  use Protobuf, syntax: :proto3, protoc_gen_elixir_version: "0.12.0"

  field :result, 1, repeated: true, type: :float
  field :shape, 2, repeated: true, type: :int64
end

defmodule Helloworld.LoadRequest do
  @moduledoc false

  use Protobuf, syntax: :proto3, protoc_gen_elixir_version: "0.12.0"

  field :image, 1, type: :string
end

defmodule Helloworld.LoadReply do
  @moduledoc false

  use Protobuf, syntax: :proto3, protoc_gen_elixir_version: "0.12.0"
end

defmodule Helloworld.Greeter.Service do
  @moduledoc false

  use GRPC.Service, name: "helloworld.Greeter", protoc_gen_elixir_version: "0.12.0"

  rpc :SayHello, Helloworld.HelloRequest, Helloworld.HelloReply

  rpc :SayHelloStreamReply, Helloworld.HelloRequest, stream(Helloworld.HelloReply)

  rpc :Process, Helloworld.ProcessRequest, Helloworld.ProcessReply

  rpc :Load, Helloworld.LoadRequest, Helloworld.LoadReply
end

defmodule Helloworld.Greeter.Stub do
  @moduledoc false

  use GRPC.Stub, service: Helloworld.Greeter.Service
end