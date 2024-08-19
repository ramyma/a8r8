import { ComfySoftInpaintingArgs } from "./ComfySoftInpaintingFields";

export const defaultComfySoftPaintingArgs: ComfySoftInpaintingArgs = {
  isEnabled: false,
  maskBlur: 6,
};

export const comfySoftPaintingFields: {
  label: string;
  name: keyof ComfySoftInpaintingArgs;
  value: number;
  min: number;
  max: number;
  step: number;
}[] = [
  {
    label: "Mask Blur",
    name: "maskBlur",
    value: 6,
    min: 0,
    max: 30,
    step: 1,
  },
];
