wsl --install -d ubuntu --no-launch
wsl -e bash -c "CLONE_REPO=true ./install.sh"
cd .\a8r8\
echo 'If instalaltion was successfull, run ".\run.bat" in the created "a8r8" folder to start the application'