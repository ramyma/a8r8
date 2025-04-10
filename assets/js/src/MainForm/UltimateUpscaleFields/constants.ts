import { FieldsSectionFunc } from "../FieldsSection/FieldsSections";
import {
  UltimateUpscaleArgs,
  UltimateUpscaleFieldsExtras,
} from "./UltimateUpscaleFields";

export const ultimateUpscaleFields: FieldsSectionFunc<
  UltimateUpscaleArgs,
  UltimateUpscaleFieldsExtras
> = (formData, fieldsExtras) => [
  {
    name: "mode_type",
    label: "Mode Type",
    type: "select",
    value: "Linear",
    items: ["Linear", "Chess"],
  },
  {
    name: "tile_width",
    label: "Tile Width",
    type: "range",

    value:
      fieldsExtras?.model.isFlux ||
      fieldsExtras?.model.isSdXl ||
      fieldsExtras?.model.isPony ||
      fieldsExtras?.model.isSd35
        ? 1024
        : 512,
    min: 64,
    max: 8192,
    step: 8,
  },
  {
    name: "tile_height",
    label: "Tile Height",
    type: "range",

    value:
      fieldsExtras?.model.isFlux ||
      fieldsExtras?.model.isSdXl ||
      fieldsExtras?.model.isPony ||
      fieldsExtras?.model.isSd35
        ? 1024
        : 512,
    min: 64,
    max: 8192,
    step: 8,
  },
  {
    name: "mask_blur",
    label: "Mask Blur",
    type: "range",

    value: 8,
    min: 0,
    max: 64,
    step: 1,
  },
  {
    name: "tile_padding",
    label: "Tile Padding",
    type: "range",

    value: 32,
    min: 0,
    max: 8192,
    step: 8,
  },
  {
    name: "seam_fix_mode",
    label: "Seam Fix Mode",
    type: "select",
    value: "None",
    items: ["None", "Band Pass", "Half Tile", "Half Tile + Intersections"],
  },
  {
    name: "seam_fix_denoise",
    label: "Seam Fix Denoise",
    type: "range",
    value: 1,
    min: 0,
    max: 1,
    step: 0.01,
    disabled: formData.ultimateUpscale?.seam_fix_mode === "None",
  },
  {
    name: "seam_fix_width",
    label: "Seam Fix Width",
    type: "range",
    value: 64,
    min: 0,
    max: 8192,
    step: 8,
    disabled: formData.ultimateUpscale?.seam_fix_mode === "None",
  },
  {
    name: "seam_fix_mask_blur",
    label: "Seam Fix Mask Blur",
    type: "range",
    value: 8,
    min: 0,
    max: 64,
    step: 1,
    disabled: formData.ultimateUpscale?.seam_fix_mode === "None",
  },

  {
    name: "seam_fix_padding",
    label: "Seam Fix Padding",
    type: "range",
    value: 16,
    min: 0,
    max: 8192,
    step: 8,
    disabled: formData.ultimateUpscale?.seam_fix_mode === "None",
  },
  {
    name: "force_uniform_tiles",
    label: "Force Uniform Tiles",
    type: "boolean",
    value: true,
  },
  {
    name: "tiled_decode",
    label: "Tiled Decode",
    type: "boolean",
    value: false,
  },
];
