import { FieldsType } from "../MainForm";
import { SelfAttentionGuidanceArgs } from "./SelfAttentionGuidanceFields";

export const defaultSelfAttentionGuidanceArgs: SelfAttentionGuidanceArgs = {
  is_enabled: false,
  scale: 0.5,
  blur_sigma: 2,
};

export const selfAttentionGuidanceFields: FieldsType<SelfAttentionGuidanceArgs> =
  [
    {
      label: "Scale",
      name: "scale",
      value: 0.5,
      min: -2,
      max: 5,
      step: 0.01,
      type: "range",
    },
    {
      label: "Blur Sigma",
      name: "blur_sigma",
      value: 2,
      min: 0,
      max: 10,
      step: 0.1,
      type: "range",
    },
  ];
