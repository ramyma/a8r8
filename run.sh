#!/bin/bash

export MIX_ENV="prod"
export PHX_SERVER="true"
export AUTO_URL="http://localhost:7860"
export COMFY_URL="http://localhost:8188"

mix phx.server
