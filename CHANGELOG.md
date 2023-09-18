# Changelog

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
