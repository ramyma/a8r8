#!/bin/bash

if ! [ "$UPDATE" = true ]; then
    sudo apt -y update
    sudo apt -y install wget
fi

echo "Fetching latest release"
wget https://github.com/ramyma/a8r8/releases/latest/download/A8R8_ubuntu-22-04_build.tar.zst
tar -xvf A8R8_ubuntu-22-04.tar.zst

rm A8R8_ubuntu-22-04.tar.zst

if [ "$UPDATE" = true ]; then
    echo "Update done!"
else
    echo "Installation done!"
fi
