import { Model } from "../../App.d";
import { FieldsSectionFunc } from "../FieldsSection/FieldsSections";
import {
  TiledDiffusionArgs,
  TiledDiffusionFieldsExtras,
} from "./TieldDiffusionFields";

export const tiledDiffusionFields: FieldsSectionFunc<
  TiledDiffusionArgs,
  TiledDiffusionFieldsExtras
> = (_formData, fieldsExtras) => [
  // {
  //   label: "Method",
  //   name: "method",
  //   value: "",
  //   type: "select",
  // },
  {
    label: "Tile Width",
    name: "tile_width",
    value:
      fieldsExtras?.model.isFlux ||
      fieldsExtras?.model.isSdXl ||
      fieldsExtras?.model.isPony ||
      fieldsExtras?.model.isSd35
        ? 1024
        : 512,
    min: 16,
    max: 8192,
    step: 16,
    type: "range",
  },
  {
    label: "Tile Height",
    name: "tile_height",
    value:
      fieldsExtras?.model.isFlux ||
      fieldsExtras?.model.isSdXl ||
      fieldsExtras?.model.isPony ||
      fieldsExtras?.model.isSd35
        ? 1024
        : 512,
    min: 16,
    max: 8192,
    step: 16,
    type: "range",
  },
  {
    label: "Tile Overlap",
    name: "tile_overlap",
    value: 64,
    min: 0,
    max: 2048,
    step: 32,
    type: "range",
  },
  {
    label: "Tile Batch Size",
    name: "tile_batch_size",
    value: 4,
    min: 1,
    max: 8192,
    step: 1,
    type: "range",
  },
];
