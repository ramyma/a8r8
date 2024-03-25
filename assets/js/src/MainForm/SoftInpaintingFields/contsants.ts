import { SoftInpaintingArgs } from "./SoftInpaintingFields";

export const defaultSoftPaintingArgs: SoftInpaintingArgs = {
  "Schedule bias": 1,
  "Preservation strength": 0.5,
  "Transition contrast boost": 4,
  "Mask influence": 0,
  "Difference threshold": 0.5,
  "Difference contrast": 2,
};

export const softPaintingFields: {
  label: keyof SoftInpaintingArgs;
  value: number;
  min: number;
  max: number;
  step: number;
}[] = [
  {
    label: "Schedule bias",
    value: 1,
    min: 0,
    max: 8,
    step: 0.1,
  },
  {
    label: "Preservation strength",
    value: 0.5,
    min: 0,
    max: 8,
    step: 0.05,
  },
  {
    label: "Transition contrast boost",
    value: 4,
    min: 1,
    max: 32,
    step: 0.5,
  },
  {
    label: "Mask influence",
    value: 0,
    min: 0,
    max: 1,
    step: 0.05,
  },
  {
    label: "Difference threshold",
    value: 0.5,
    min: 0,
    max: 8,
    step: 0.25,
  },
  {
    label: "Difference contrast",
    value: 2,
    min: 0,
    max: 8,
    step: 0.25,
  },
];
