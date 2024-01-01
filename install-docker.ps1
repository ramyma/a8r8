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

scoop install main/docker
scoop install main/docker-compose

docker compose build