# Find eligible builder and runner images on Docker Hub. We use Ubuntu/Debian
# instead of Alpine to avoid DNS resolution issues in production.
#
# https://hub.docker.com/r/hexpm/elixir/tags?page=1&name=ubuntu
# https://hub.docker.com/_/ubuntu?tab=tags
#
# This file is based on these images:
#
#   - https://hub.docker.com/r/hexpm/elixir/tags - for the build image
#   - https://hub.docker.com/_/debian?tab=tags&page=1&name=bullseye-20220801-slim - for the release image
#   - https://pkgs.org/ - resource for finding needed packages
#   - Ex: hexpm/elixir:1.14.4-erlang-25.0.4-debian-bullseye-20220801-slim
#
ARG ELIXIR_VERSION=1.15.5
ARG OTP_VERSION=25.3.2.5
ARG DEBIAN_VERSION=buster-20230612-slim

ARG BUILDER_IMAGE="hexpm/elixir:${ELIXIR_VERSION}-erlang-${OTP_VERSION}-debian-${DEBIAN_VERSION}"
ARG RUNNER_IMAGE="debian:${DEBIAN_VERSION}"

FROM ${BUILDER_IMAGE} as nodeBuilder

# install build dependencies
RUN --mount=type=cache,target=/var/cache/apt,sharing=private \
  apt-get update -y && apt-get install -y curl

RUN --mount=type=cache,target=/var/cache/apt,sharing=private \
  curl -fsSL https://deb.nodesource.com/setup_18.x | bash - &&\
  apt-get install -y nodejs

RUN npm install -g pnpm

# prepare build dir
WORKDIR /app

# set build ENV
ENV MIX_ENV="prod"

WORKDIR /app/assets

COPY assets/pnpm-lock.yaml ./
RUN pnpm fetch

COPY assets ./
RUN pnpm install --offline

ENV NODE_ENV="production"

RUN pnpm build

WORKDIR /app

FROM ${BUILDER_IMAGE} as builder

# install build dependencies
RUN --mount=type=cache,target=/var/cache/apt,sharing=private \
  apt-get update -y && apt-get install -y libstdc++6 build-essential curl


# prepare build dir
WORKDIR /app

# install hex + rebar
RUN mix local.hex --force && \
  mix local.rebar --force

# set build ENV
ENV MIX_ENV="prod"

# install mix dependencies
COPY mix.exs mix.lock ./
RUN mix deps.get --only $MIX_ENV
RUN mkdir config

# copy compile-time config files before we compile dependencies
# to ensure any relevant config change will trigger the dependencies
# to be re-compiled.
COPY config/config.exs config/${MIX_ENV}.exs config/

# ENV XLA_TARGET="cuda118"

RUN mix deps.compile

COPY lib lib

COPY priv priv

COPY --from=nodeBuilder /app/priv/static/assets priv/static/assets

# compile assets
# RUN mix assets.deploy

# Compile the release
RUN mix compile
RUN mix phx.digest
# Changes to config/runtime.exs don't require recompiling the code
COPY config/runtime.exs config/

COPY rel rel
RUN mix release

# start a new build stage so that the final image will only contain
# the compiled release and other runtime necessities
FROM ${RUNNER_IMAGE}

RUN --mount=type=cache,target=/var/cache/apt,sharing=private \ 
  apt-get update -y && apt-get install -y libstdc++6 openssl libncurses5 locales curl

# Set the locale
RUN sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen && locale-gen

ENV LANG en_US.UTF-8
ENV LANGUAGE en_US:en
ENV LC_ALL en_US.UTF-8

WORKDIR "/app"
RUN chown nobody /app

# set runner ENV
ENV MIX_ENV="prod"
ENV PHX_HOST=localhost

# Only copy the final release from the build stage
COPY --from=builder --chown=nobody:root /app/_build/${MIX_ENV}/rel/ex_sd ./

USER nobody
ENV PHX_SERVER=true 
CMD ["bin/ex_sd","start"]
