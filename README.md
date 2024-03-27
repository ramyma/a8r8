# A8R8 (Alternate Reality)

An opinionated interface for SD (Stable Diffusion) image generation, and more.

<sub>Links: [[Discord](https://discord.gg/RzdGa839MK)]</sub>

&nbsp;
![Interface](readme/screenshots/interface.png)
*Unified interface*

&nbsp;

- [A8R8 (Alternate Reality)](#a8r8-alternate-reality)
  - [Features](#features)
  - [Getting started](#getting-started)
    - [Installation](#installation)
      - [Windows WSL2](#windows-wsl2)
      - [Docker](#docker)
      - [Windows (EXPERIMENTAL / BROKEN)](#windows-experimental--broken)
    - [Running](#running)
      - [Docker](#docker-1)
      - [Windows (EXPERIMENTAL / BROKEN)](#windows-experimental--broken-1)
    - [Updating](#updating)
      - [Windows WSL2](#windows-wsl2-1)
      - [Docker](#docker-2)
      - [Windows (EXPERIMENTAL / BROKEN)](#windows-experimental--broken-2)
  - [Key Shortcuts](#key-shortcuts)
  - [Development Environment](#development-environment)
  - [Sample Generations](#sample-generations)

&nbsp;

## Features

- Works with existing [Forge](https://github.com/lllyasviel/stable-diffusion-webui-forge), [A1111](https://github.com/AUTOMATIC1111/stable-diffusion-webui) and [ComfyUI](https://github.com/comfyanonymous/ComfyUI) SD installations; **NO NEED** to reinstall yet another SD implementation
- Runs in browser
- Full [Controlnet](https://github.com/Mikubill/sd-webui-controlnet) support
- Controlnet mask layers with Forge
- Open canvas with unified interface
- Inpainting/Outpainting with masking and scaling
- VRam usage info
- Scaling and hires like built in solution
- Integration with [TiledVAE](https://github.com/pkuliyi2015/multidiffusion-upscaler-for-automatic1111), [Tiled Diffusion](https://github.com/pkuliyi2015/multidiffusion-upscaler-for-automatic1111) and [Self Attention Guidance](https://github.com/ashen-sensored/sd_webui_SAG)
- Integration with Ultimate Scale with [A1111](https://github.com/Coyote-A/ultimate-upscale-for-automatic1111) and [ComfyUI](https://github.com/ssitu/ComfyUI_UltimateSDUpscale)
- Sketch, mask and Controlnet layers
- Image info support (on import only for now)
- Text editor with auto complete for installed LORAs & embeddings
- Color picker for mask color and brush color
- Edit detection map on canvas
- Copy support for base layer and copy/paste support for CN layers
- Drag and drop images from disk
- On canvas generation live preview
- Initial support for synchronized sessions across tabs/machines connected to the same server
- Potential to add any A1111 extension in the future

&nbsp;

&nbsp;

![Scaling](readme/screenshots/editor_commands_autocomplete.png)\
*Editor autocomplete for LORAs and embeddings*

&nbsp;

![Scaling](readme/screenshots/scaling.png)\
*Scaling controls*

&nbsp;

![Outpainting](readme/screenshots/outpainting.png)
*Outpainting / Inpainting*

&nbsp;

![Layers](readme/screenshots/layers.png)\
*Layers*

&nbsp;

![Scribbling](readme/screenshots/scribbling.png)
*Scribbling*

&nbsp;

![Scribble over canvas](readme/screenshots/scribble_over_canvas.png)
*Scribble over canvas*

&nbsp;

![Toggle layer visibility](readme/screenshots/toggle_layer_visibility.png)
*Toggle layer visibility*

&nbsp;

## Getting started

### Installation

**Update v0.0.4:**  Added one click installer for Windows (WSL2) and Debian based Linux `install.sh`, check [installation steps](#windows-wsl2) for details.

**Update:** Added one click installer for Windows `install-docker.ps1`, check [installation steps](#docker) for details.

Keep in mind this hasn't been tested, please report any issues [here](https://github.com/ramyma/a8r8/discussions/5)

#### Windows WSL2

1. Install [Forge](https://github.com/lllyasviel/stable-diffusion-webui-forge) and/or[Automatic1111 webui](https://github.com/AUTOMATIC1111/stable-diffusion-webui#installation-and-running) and/or [ComfyUI](https://github.com/comfyanonymous/ComfyUI)  if you haven't yet
2. Clone this repo and open a terminal at the root directory
3. Install WSL2 by typing `wsl --install` to install the default Ubuntu distro
4. Run wsl `wsl`
5. Set the user name and password if it's your first time using it. Make sure you remember the password you entered
6. Run `./install.sh`
7. Run `./run.sh` 
8. Start the SD backend of your choice
   1. Forge/Automatic1111 webui and make sure to add `--api --listen` to `COMMANDLINE_ARGS` under `webui-user.sh` or `webui-user.bat` [depending on the operating system](https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/Command-Line-Arguments-and-Settings#webui-user)
   2. [ComfyUI](https://github.com/comfyanonymous/ComfyUI)
      1. Install [A8R8 supporting nodes](https://github.com/ramyma/A8R8_ComfyUI_nodes)
      2. Add `--preview-method auto --listen` to the run command, ex: `python main.py --preview-method auto --listen`
      3. Install <https://github.com/ssitu/ComfyUI_UltimateSDUpscale>
      4. Install <https://github.com/Fannovel16/comfyui_controlnet_aux>

#### Docker

1. Install [Automatic1111 webui](https://github.com/AUTOMATIC1111/stable-diffusion-webui#installation-and-running) and/or [ComfyUI](https://github.com/comfyanonymous/ComfyUI)  if you haven't yet
2. Clone this repo and open a terminal at the root directory
3. On Windows you can run `install-docker.ps1` in a powershell window or:
   1. Install [Docker Compose](https://docs.docker.com/compose/gettingstarted/)
   2. Run `docker compose build`
4. Start the SD backend of your choice
   1. Automatic1111 webui and make sure to add `--api --listen` to `COMMANDLINE_ARGS` under `webui-user.sh` or `webui-user.bat` [depending on the operating system](https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/Command-Line-Arguments-and-Settings#webui-user)
   2. [ComfyUI](https://github.com/comfyanonymous/ComfyUI)
      1. Install [A8R8 supporting nodes](https://github.com/ramyma/A8R8_ComfyUI_nodes)
      2. Add `--preview-method auto --listen` to the run command, ex: `python main.py --preview-method auto --listen`
      3. Install <https://github.com/ssitu/ComfyUI_UltimateSDUpscale>
      4. Install <https://github.com/Fannovel16/comfyui_controlnet_aux>

#### Windows (EXPERIMENTAL / BROKEN)

1. Clone this repo and open a terminal at the root directory
2. Run `install.ps1` in a powershell window

### Running
1. Run `wsl` in a terminal 
2. Run `./run.sh`

#### Docker

On Windows you can run `install-docker.ps1` in a powershell window

Or

1. Run `docker compose up`
2. Point your browser to [http://localhost:4000](http://localhost:4000), it's preferred to use a chromium based browser (Brave, Chromium, Chrome)

#### Windows (EXPERIMENTAL / BROKEN)

1. Run `run.ps1` in a powershell window

Keep in mind this hasn't been tested, please report any issues [here](https://github.com/ramyma/a8r8/discussions/5)

Update: one of the dependencies doesn't work with Windows at the moment, so it won't run successfully

### Updating

#### Windows WSL2
1. Run `wsl`
2. Run `git pull`
3. Run `./install.sh`

#### Docker

On Windows you can run `install-docker.ps1` in a powershell window

Or

1. Run `git pull`
2. Run `docker compose build`

#### Windows (EXPERIMENTAL / BROKEN)

1. Run `install.ps1` in a powershell window
2. Keep in mind this hasn't been tested, please report any issues [here](https://github.com/ramyma/a8r8/discussions/5)

Update: one of the dependencies doesn't work with Windows at the moment, so it won't run successfully

## Key Shortcuts

Key/Combo/Action | Fuctionality
---------|----------
 `-` | zoom out canvas
 `+` | zoom in canvas
 `1` | reset zoom
 `Middle Mouse Button click` | pan canvas
 `[` with optional `CTRL` or `Shift` for fine control| decrease brush size
 `]` with optional `CTRL` or `Shift` for fine control| increase brush size
 `← → ↑ ↓ arrows` + `SHIFT` | move selection box and increase movement amount by pressing shift
 `s` | toggle selection box and paint modes
 `t` | toggle tool between brush and eraser
 `p` | toggle brush color selector
 `h` | hide mask layer
 `c` | clear mask, sketch or controlnet brush strokes of the active layer
 `m` | toggle between mask and sketch layers
 `CTRL + z` | undo generation image addition, mask paint, sketch paint
 `CTRL + SHIFT + z`, `CTRL + y`| redo generation image addition, mask paint, sketch paint
 `CTRL + c`| copy image to clipboard within selection box bounds from the base layer
 `CTRL + v`| paste image from clipboard at the selection box top left corner position to the base or active controlnet layer. Generation info will be applied if found when pasting to base layer
 `CTRL + s`| save image within selection box bounds to disk
 `Drop PNG image to canvas` | add image at the selection box top left corner position to the base or active controlnet layer. Generation info will be applied if found when pasting to base layer

## Development Environment

To be added...

&nbsp;

&nbsp;

## Sample Generations

![ex1](readme/examples/ex1.png)

&nbsp;

![lion head](readme/examples/lion-head.jpg)

&nbsp;

![ex2](readme/examples/ex2.png)

&nbsp;

![ex3](readme/examples/ex3.png)

&nbsp;

![ex4](readme/examples/ex4.png)\
*Outpainting in hires*
