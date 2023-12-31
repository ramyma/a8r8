# Changelog

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
