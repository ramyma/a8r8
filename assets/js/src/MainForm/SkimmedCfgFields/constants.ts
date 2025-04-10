import { FieldsType } from "../MainForm";
import { SkimmedCfgArgs } from "./SkimmedCfgFields";

export const defaultSkimmedCfgArgs: SkimmedCfgArgs = {
  is_enabled: false,
  skimming_cfg: 2.5,
  full_skim_negative: false,
  disable_flipping_filter: false,
};

export const skimmedCfgFields: FieldsType<SkimmedCfgArgs> = [
  {
    label: "Skimming CFG",
    name: "skimming_cfg",
    value: 6,
    min: 1,
    max: 10,
    step: 0.5,
    type: "range",
  },
  {
    label: "Full Skim Negative",
    name: "full_skim_negative",
    value: false,
    type: "boolean",
  },
  {
    label: "Disable Flipping Filter",
    name: "disable_flipping_filter",
    value: false,
    type: "boolean",
  },
];
