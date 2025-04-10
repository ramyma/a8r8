import { Control } from "react-hook-form";
import { skimmedCfgFields } from "./constants";
import { MainFormValues } from "../MainForm";
import FieldsSection from "../FieldsSection/FieldsSections";

export type SkimmedCfgArgs = {
  is_enabled: boolean;
  skimming_cfg: number;
  full_skim_negative: boolean;
  disable_flipping_filter: boolean;
};

const SkimmedCfgFields = ({
  control,
}: {
  control: Control<MainFormValues>;
}) => {
  return (
    <FieldsSection<SkimmedCfgArgs>
      control={control}
      label="Skimmed CFG"
      parentFieldName="skimmedCfg"
      fields={skimmedCfgFields}
    />
  );
};

export default SkimmedCfgFields;
