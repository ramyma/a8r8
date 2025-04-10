import useExtensions from "../useExtensions";

export const REQUIRED_EXTENSIONS = [
  "A8R8_ComfyUI_nodes",
  "comfyui-manager",
  "comfyui_ultimatesdupscale",
  "comfyui_controlnet_aux",
  "comfyui-advanced-controlnet",
  "comfyui_ipadapter_plus",
  "comfyui_instantid",
  "ComfyUI-TiledDiffusion",
  "ComfyUI-GGUF",
  "skimmed_cfg",
  "comfyui_essentials",
  "comfyui-inpaint-nodes",
  "ComfyUI-Crystools",
  "teacache",
];

export const getMissingExtensions = (
  extensions: ReturnType<typeof useExtensions>["extensions"]
): string[] => {
  const missingExtensions = REQUIRED_EXTENSIONS.reduce(
    (acc, ext) =>
      !extensions?.[ext.toLocaleLowerCase()] ? [...acc, ext] : acc,
    [] as string[]
  );

  return missingExtensions;
};
