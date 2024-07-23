#!/bin/bash

sudo apt -y update
sudo apt -y install wget zstd git

if [ "$UPDATE" = true ]; then
    echo "Pulling latest"
    if [ -d "a8r8" ]; then
        cd a8r8
    fi
    git fetch
    git pull --verbose
else
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
fi

echo "Fetching latest release"
wget https://github.com/ramyma/a8r8/releases/latest/download/A8R8_ubuntu-22-04_build.tar.zst -O A8R8_ubuntu-22-04_build.tar.zst
tar -xvf A8R8_ubuntu-22-04_build.tar.zst

rm A8R8_ubuntu-22-04_build.tar.zst

if [ "$UPDATE" = true ]; then
    echo "Update complete!"
else
    echo "Installation complete!"
fi

read -p "Press Enter to close" </dev/tty
