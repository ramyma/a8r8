import { Control } from "react-hook-form";
import { smoothedEnergyGuidanceFields } from "./constants";
import { MainFormValues } from "../MainForm";
import FieldsSection from "../FieldsSection/FieldsSections";

export type SmoothedEnergyGuidanceArgs = {
  is_enabled: boolean;
  scale: number;
  blur_sigma: number;
  sigma_start: number;
  sigma_end: number;
  rescale: number;
  rescale_mode: "full" | "partial" | "snf";
};

const SmoothedEnergyGuidanceFields = ({
  control,
}: {
  control: Control<MainFormValues>;
}) => {
  return (
    <FieldsSection<SmoothedEnergyGuidanceArgs>
      control={control}
      label="Smoothed Energy Guidance"
      parentFieldName="smoothedEnergyGuidance"
      fields={smoothedEnergyGuidanceFields}
      fieldsExtras={{}}
    />
  );
};

export default SmoothedEnergyGuidanceFields;
