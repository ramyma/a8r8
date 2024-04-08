#!/bin/bash

sudo apt -y update
sudo apt -y install curl git libvips unzip libstdc++6 openssl libncurses5-dev locales curl libssl-dev build-essential autoconf m4 libncurses-dev libgl1-mesa-dev libglu1-mesa-dev libpng-dev libssh-dev unixodbc-dev xsltproc fop libxml2-utils #nvidia-cudnn

if [ "$CLONE_REPO" = true ]; then
    if [ -d "a8r8" ]; then
        echo "Repo already cloned at a8r8"
        echo "Pulling latest"
        cd a8r8
        git fetch
        git pull --verbose
    else
        git clone https://github.com/ramyma/a8r8.git || {
            printf "Git clone failed! Check your connection and run the script again.\n" >&2
            exit 1
        }
        cd a8r8
    fi
else
    echo Skipping git clone
fi

if [ "$PULL_REPO" = true ]; then
    echo "Pulling latest"
    if [ -d "a8r8" ]; then
        cd a8r8
    fi
    git fetch
    git pull --verbose
fi

if ! [ -x "$(command -v asdf)" ]; then
    if [ -d "$HOME/.asdf" ]; then
        export ASDF_DATA_DIR="$HOME/.asdf"
        . $ASDF_DATA_DIR/asdf.sh
    else
        echo 'Install required dependencies' >&2
        git clone https://github.com/asdf-vm/asdf.git ~/.asdf --branch v0.14.0

        if ! grep -Fxq '. "$HOME/.asdf/asdf.sh"' "$HOME/.bashrc"; then
            echo '. "$HOME/.asdf/asdf.sh"' >>"$HOME/.bashrc"
        fi

        # Check if asdf.bash is already in .bashrc
        if ! grep -Fxq '. "$HOME/.asdf/completions/asdf.bash"' "$HOME/.bashrc"; then
            echo '. "$HOME/.asdf/completions/asdf.bash"' >>"$HOME/.bashrc"
        fi

        source ~/.bashrc
        export ASDF_DATA_DIR="$HOME/.asdf"
        . $ASDF_DATA_DIR/asdf.sh
    fi
fi

source ~/.bashrc

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
