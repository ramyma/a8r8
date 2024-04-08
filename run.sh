#!/bin/bash

export MIX_ENV="prod"
export PHX_SERVER="true"
export HOST_IP="localhost"

if [[ $(grep -i Microsoft /proc/version) ]]; then
    echo "Bash is running on WSL"
    export HOST_IP=$(ip route show | grep -i default | awk '{ print $3}')
fi

export AUTO_URL="http://$HOST_IP:7860"
export COMFY_URL="http://$HOST_IP:8188"

if [[ -f user.sh ]]; then
    echo Loading user config...
    source user.sh
    echo Done loading user config!
fi

mix phx.server