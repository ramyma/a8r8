# Changelog

## [0.6.1] - 2024-05-31

### Fixed

- Fixed missing dependency

## [0.6.0] - 2024-05-12

### Added

- Added batch size support
- Added Comfy regional prompting

### Changed

- Comfy prompt refactoring
- UI enhancements and tweaks

### Fixed

- Fixed first time model load

## [0.5.2] - 2024-04-23

### Fixed

- Forge Couple (v1.5.0) integration for regional prompting

## [0.5.1] - 2024-04-19

### Fixed

- Fixed startup crash caused by a request timeout (WSL networking issue)

## [0.5.0] - 2024-04-15

### Added

- Added regional prompting and region mask layers - make sure to add the Forge Couple extension >= v1.3.7 to your Forge installation
- Reworked undo/redo for controlnet layers and region mask layers
- Added Tiled Diffusion initial support with Forge
- Added One-Click Installer

### Fixed

- Fixed controlnet with preprocessor set to None
- A number of other fixes and UI tweaks

## [0.4.0] - 2024-03-25

### Added

- Added install.sh and run.sh (could be used with Windows through WSL2 or debian based Linux)
- Masks for controlnet layers
- Add/remove controlnet layers dynamically
- Image preview on controlnet layer item hover
- Forge support
- Soft inpainting support
- Drag/drop of controlnet images to the layer item

### Changed

- Update color picker
- Update brush size fine control using shift/ctrl modifiers with `[` and `]`
- UI tweaks and updates

## [0.3.0] - 2024-01-22

### Added

- Comfy inpainting model support
- Show notification if generation is cached with ComfyUI
- Add ComfyUI free memory endpoint

### Changed

- Client refactor
- Update dependencies
- UI tweaks
- Optimize image rendering by updating outside of React

### Fixed

- Fix preview image positioning and dimensions in some cases

## [0.2.4] - 2023-12-31

### Added

- New selection box component with search
- VAE select
- Scheduler select for comfy
- Color picker button in toolbar
- Image uploader for controlnet layers

### Fixed

- Ultimate upscale latest version with comfy
- Generation preview aspect ratio
- Round selection box drag position correctly
- Bug fixes for some random generation errors

### Changed

- Generation time optimization for t2i; 40%~50% faster with A1111
- Text editor attention text style and incrementation behavior
- Allow deselecting mode and tool in toolbar
- Set default controlnet mode to resize and crop
- Smarter resizing logic based on model type (1.*/XL)
- Style tweaks
- Dependencies update

## [0.2.3] - 2023-09-18

### Fixed

- Comfy txt2img with upscalers other than latent
 
### Changed

- Changed lora attention increment to 0.1

## [0.2.2] - 2023-09-18

### Changed

- Updated JS dependencies

### Fixed

- Fixed Comfy Controlnet integration after comfyui_controlnet_aux update

## [0.2.1] - 2023-09-15

### Fixed

- Comfy controlnet with preprocessor set to none

## [0.2.0] - 2023-09-13

### Added

- Added [ComfyUI](https://github.com/comfyanonymous/ComfyUI) support
- Initial support for [Controlnet with Comfy](https://github.com/Fannovel16/comfyui_controlnet_aux)
- Added Ultimate Upscale integration with [A1111](https://github.com/Coyote-A/ultimate-upscale-for-automatic1111) and [ComfyUI](https://github.com/ssitu/ComfyUI_UltimateSDUpscale)

### Changed

- Increased the side panel width
- Downgraded the OTP version to v25 until v26 gets a memory leak [fix](https://github.com/erlang/otp/issues/7292#issuecomment-1688181562) merged
- Refactoring and cleanup

### Fixed

- Scale adaptation when generation box is scaled down below the native resolution of the active model
- Docker build was broken; removed some dependencies until it's sorted out
