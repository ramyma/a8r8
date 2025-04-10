import { FieldsSectionFunc } from "../FieldsSection/FieldsSections";
import { SmoothedEnergyGuidanceArgs } from "./SmoothedEnergyGuidanceFields";

export const smoothedEnergyGuidanceFields: FieldsSectionFunc<
  SmoothedEnergyGuidanceArgs
> = (formFields) => [
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
    label: "Blur Sigma",
    name: "blur_sigma",
    type: "range",

    value: -1,
    min: -1,
    max: 9999,
    step: 0.01,
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

    value: -1,
    min: -1,
    max: 10000,
    step: 0.01,
  },
  {
    label: "Rescale",
    name: "rescale",

    type: "range",
    disabled: formFields.smoothedEnergyGuidance?.rescale_mode === "snf",
    value: 0,
    min: 0,
    max: 1,
    step: 0.01,
  },
  {
    label: "Rescale Mode",
    name: "rescale_mode",
    type: "select",
    value: "full",
    items: [
      { label: "Full", value: "full" },
      { label: "Partial", value: "partial" },
      { label: "SNF", value: "snf" },
    ],
  },
];
