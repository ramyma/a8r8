#!/bin/bash

sudo apt -y update
sudo apt -y install wget zstd #git

current_version=$(cat version.txt)

echo

if [ $UPDATE = true ]; then
    echo "Checking latest version"
    echo

    # latest_tag = $(git -c 'versionsort.suffix=-' ls-remote --tags --sort='version:refname' -- https://github.com/ramyma/a8r8.git '*.*.*' | tail --lines=1 | cut --delimiter='/' --fields=3)
    latest_version=$(wget -qO- https://github.com/ramyma/a8r8/releases/latest/download/version.txt) || {
        echo "Failed to fetch latest version!\n"
        bash -i -c "read -p 'Press Enter to close...'"
        exit 1
    }

    if [ "$latest_version" = "$current_version" ]; then
        echo "Already up to date!"
        echo
        bash -i -c "read -p 'Press Enter to close...'"
        exit 1
    else
        if [ "$WSL" = true ]; then
            echo "Fetching latest installer"
            echo

            wget https://github.com/ramyma/a8r8/releases/latest/download/A8R8_One-Click-Installer.zip -O A8R8_One-Click-Installer.zip || {
                echo "Failed to fetch latest One-Click-Installer! Try downloading it manually.\n"
                bash -i -c "read -p 'Press Enter to close...'"
                exit 1
            }

            #Unzip and overwite
            unzip -o A8R8_One-Click-Installer.zip

            sh install-packaged.sh

            exit 1
        fi
        echo "Fetching latest version"
        echo

        wget https://github.com/ramyma/a8r8/releases/latest/download/A8R8_ubuntu-22-04_build.tar.zst -O A8R8_ubuntu-22-04_build.tar.zst || {
            echo "Failed to fetch latest version!\n"
            bash -i -c "read -p 'Press Enter to close...'"
            exit 1
        }
    fi
else
    echo "Fetching ${current_version}"
    echo
    wget "https://github.com/ramyma/a8r8/releases/download/${current_version}/A8R8_ubuntu-22-04_build.tar.zst" -O A8R8_ubuntu-22-04_build.tar.zst || {
        echo "Failed to fetch build for ${current_version}!\n"
        bash -i -c "read -p 'Press Enter to close...'"
        exit 1
    }
fi

tar -xvf A8R8_ubuntu-22-04_build.tar.zst

echo

if [ "$UPDATE" = true ]; then
    echo "Update complete!"
else
    echo "Installation complete!"
fi

echo

bash -i -c "read -p 'Press Enter to close...'"
exit 1
