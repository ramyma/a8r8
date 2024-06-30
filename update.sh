#!/bin/bash

if [[ $(grep -i Microsoft /proc/version) ]]; then
    echo "Bash is running on WSL"

    export ASDF_DATA_DIR="$HOME/.asdf"
    . $ASDF_DATA_DIR/asdf.sh
fi

echo Initiating update...

case "$OSTYPE" in
darwin*)
    echo Updating for Mac
    PULL_REPO=true ./install-mac.sh
    ;;
linux*)
    echo Updating for Linux
    PULL_REPO=true ./install.sh
    ;;
*)
    echo Updating for $OSTYPE
    PULL_REPO=true ./install.sh
    ;;
esac
