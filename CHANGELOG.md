# Changelog

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