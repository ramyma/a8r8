import { FieldsSectionFunc } from "../FieldsSection/FieldsSections";
import { PerturbedAttentionGuidanceArgs } from "./PerturbedAttentionGuidanceFields";

export const perturbedAttentionGuidanceFields: FieldsSectionFunc<
  PerturbedAttentionGuidanceArgs
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
    label: "Adaptive Scale",
    name: "adaptive_scale",
    type: "range",
    value: 0,
    min: 0,
    max: 1,
    step: 0.001,
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
    value: 0,
    min: 0,
    max: 1,
    step: 0.01,
    disabled: formFields.perturbedAttentionGuidance?.rescale_mode === "snf",
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
