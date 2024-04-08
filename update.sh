#!/bin/bash

if [[ $(grep -i Microsoft /proc/version) ]]; then
    echo "Bash is running on WSL"

    export ASDF_DATA_DIR="$HOME/.asdf"
    . $ASDF_DATA_DIR/asdf.sh
fi

echo Initiating update...

PULL_REPO=true ./install.sh
