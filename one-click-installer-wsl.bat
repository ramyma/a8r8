wsl --install -d ubuntu --no-launch
wsl -e bash -c "CLONE_REPO=true ./install.sh"

echo 'If instalaltion was successfull, run the "run.bat" file in the created "a8r8" folder to start the application'