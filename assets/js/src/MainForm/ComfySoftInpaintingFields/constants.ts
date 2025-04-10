import { FieldsType } from "../MainForm";
import { ComfySoftInpaintingArgs } from "./ComfySoftInpaintingFields";

export const defaultComfySoftPaintingArgs: ComfySoftInpaintingArgs = {
  isEnabled: false,
  maskBlur: 6,
};

export const comfySoftPaintingFields: FieldsType<ComfySoftInpaintingArgs> = [
  {
    label: "Mask Blur",
    name: "maskBlur",
    value: 6,
    min: 0,
    max: 30,
    step: 1,
    type: "range",
  },
];
