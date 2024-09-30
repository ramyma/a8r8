wsl --install -d ubuntu --no-launch
wsl -d ubuntu -e bash -c "./install-packaged.sh"

echo 'If instalaltion was successfull, run the "run-windows-wsl.bat" script file'