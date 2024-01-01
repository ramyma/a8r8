
if (Get-Command git -errorAction SilentlyContinue) {
    if (Test-Path .git) {
        git pull
    }
    else {
        Write-Warning ".git directory missing, clone the repo using git to be able to update"
    }
}
else {
    Write-Warning "Install git to be able to fetch updates"
}

Write-Output "Installing scoop for dependency management"

if (! (Get-Command scoop -errorAction SilentlyContinue)) {
    Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
    Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression
}

$env:Path = [System.Environment]::ExpandEnvironmentVariables([System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User"));

scoop bucket add main
scoop bucket add versions

Write-Output "Installing dependencies"

scoop install main/erlang@26.2.1
scoop install main/elixir@1.16.0
scoop install versions/nodejs20
scoop install main/pnpm
scoop install main/libvips

pnpm -C assets i
$env:NODE_ENV="production"
pnpm -C assets build

$env:MIX_ENV="prod"
$env:PHX_SERVER="true"
  
mix local.hex --force
mix local.rebar --force
mix deps.get --only prod
mix compile
mix phx.digest

Write-Output "Installation done!"





