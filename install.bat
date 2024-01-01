@echo off

git pull
if errorlevel 1 (
    echo "Install git and clone the repo to be able to update here"
)

echo "Installing scoop for dependency management"

Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression


scoop bucket add main
scoop bucket add versions

echo "Installing dependencies"

scoop install main/erlang@26.2.1
scoop install main/elixir@1.16.0
scoop install versions/nodejs20
scoop install main/pnpm

cd .\assets

pnpm i

set NODE_ENV=production

pnpm build

cd ..

set MIX_ENV=prod
set PHX_SERVER=true

mix local.hex --force
mix local.rebar --force
mix deps.get --only prod
mix compile
mix phx.digest


echo "Installation done!"


