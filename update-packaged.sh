#!/bin/bash

if [[ $(grep -i Microsoft /proc/version) ]]; then
    echo "Bash is running on WSL"

    export WSL=true
fi

echo Initiating update...

echo Updating for $OSTYPE

UPDATE=true sh install-packaged.sh
