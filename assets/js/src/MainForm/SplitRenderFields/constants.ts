import { SplitRenderArgs } from "./SplitRenderFields";

export const defaultSplitRenderArgs: SplitRenderArgs = {
  is_enabled: false,
  split_ratio: 0.55,
  noise_injection_strength: 3,
};

export const splitRenderFields: (
  | {
      label: string;
      name: keyof SplitRenderArgs;
      value: number;
      min: number;
      max: number;
      step: number;
      type: "range";
    }
  | {
      label: string;
      name: keyof SplitRenderArgs;
      value: boolean;
      type: "boolean";
    }
)[] = [
  {
    label: "Split Ratio",
    name: "split_ratio",
    value: 0.55,
    min: 0.1,
    max: 1,
    step: 0.01,
    type: "range",
  },
  {
    label: "Noise Injection Strength",
    name: "noise_injection_strength",
    value: 3,
    min: 0,
    max: 10,
    step: 0.1,
    type: "range",
  },
];
