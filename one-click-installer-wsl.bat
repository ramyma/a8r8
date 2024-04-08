wsl --install ubuntu --no-launch
wsl -e bash -c "CLONE_REPO=true ./install.sh"

echo 'Run "run.bat" in the created "a8r8" folder to start the application'