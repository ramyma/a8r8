#!/bin/bash

export MIX_ENV="prod"
export PHX_SERVER="true"
export HOST_IP="localhost"

if [[ $(grep -i Microsoft /proc/version) ]]; then
    echo "Bash is running on WSL"
    export HOST_IP=$(ip route show | grep -i default | awk '{ print $3}')

    export ASDF_DATA_DIR="$HOME/.asdf"
    . $ASDF_DATA_DIR/asdf.sh
fi

export AUTO_URL="http://$HOST_IP:7860"
export COMFY_URL="http://$HOST_IP:8188"

if [[ -f user.sh ]]; then
    echo Loading user config...
    source user.sh
    echo Done loading user config!
fi

echo "Accessing A1111/Forge on $AUTO_URL"
echo "Accessing ComfyUI on $COMFY_URL"

mix phx.server
