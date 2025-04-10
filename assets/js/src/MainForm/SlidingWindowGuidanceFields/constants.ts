import { FieldsType } from "../MainForm";
import { SlidingWindowGuidanceArgs } from "./SmoothedEnergyGuidanceFields";

export const slidingWindowGuidanceFields: FieldsType<SlidingWindowGuidanceArgs> =
  [
    {
      label: "Scale",
      name: "scale",
      value: 1.5,
      min: 0,
      max: 5,
      step: 0.1,
      type: "range",
    },
    {
      label: "Tile Width",
      name: "tile_width",
      type: "range",
      value: 768,
      min: 16,
      max: 16384,
      step: 8,
    },
    {
      label: "Tile Height",
      name: "tile_height",
      type: "range",
      value: 768,
      min: 16,
      max: 16384,
      step: 8,
    },
    {
      label: "Tile Overlap",
      name: "tile_overlap",
      type: "range",
      value: 256,
      min: 16,
      max: 16384,
      step: 8,
    },
    {
      label: "Sigma Start",
      name: "sigma_start",
      type: "range",
      value: -1,
      min: -1,
      max: 10000,
      step: 0.01,
    },
    {
      label: "Sigma End",
      name: "sigma_end",
      type: "range",
      value: 5.42,
      min: -1,
      max: 10000,
      step: 0.01,
    },
  ];
