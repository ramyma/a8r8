#!/bin/bash

sudo apt -y update
sudo apt -y install curl git libvips unzip libstdc++6 openssl libncurses5-dev locales curl libssl-dev build-essential autoconf m4 libncurses-dev libgl1-mesa-dev libglu1-mesa-dev libpng-dev libssh-dev unixodbc-dev xsltproc fop libxml2-utils #nvidia-cudnn

if ! [ -x "$(command -v asdf)" ]; then
    echo 'Install required dependencies' >&2
    git clone https://github.com/asdf-vm/asdf.git ~/.asdf --branch v0.14.0
    echo '. "$HOME/.asdf/asdf.sh"' >>~/.bashrc
    echo '. "$HOME/.asdf/completions/asdf.bash"' >>~/.bashrc
    source ~/.bashrc
fi

asdf plugin add nodejs https://github.com/asdf-vm/asdf-nodejs.git
asdf plugin add erlang https://github.com/asdf-vm/asdf-erlang.git
asdf plugin-add elixir https://github.com/asdf-vm/asdf-elixir.git
asdf plugin-add rust https://github.com/asdf-community/asdf-rust.git

asdf install

if ! [ -x "$(command -v sudo npm)" ]; then
    sudo ln -sf "$(which npm)" /usr/bin/npm
fi
if ! [ -x "$(command -v sudo node)" ]; then
    sudo ln -sf "$(which node)" /usr/bin/node
fi

npm install -g pnpm

pnpm -C assets i

export NODE_ENV="production"

pnpm -C assets build || {
    printf "Assets build failed!\n" >&2
    exit 1
}

export MIX_ENV="prod"
export PHX_SERVER="true"

mix local.hex --force
mix local.rebar --force
mix deps.get --only prod
mix compile
mix phx.digest

echo "Installation done!"
