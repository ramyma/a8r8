import { Control } from "react-hook-form";
import { perturbedAttentionGuidanceFields } from "./constants";
import { MainFormValues } from "../MainForm";
import FieldsSection from "../FieldsSection/FieldsSections";

export type PerturbedAttentionGuidanceArgs = {
  is_enabled: boolean;
  scale: number;
  adaptive_scale: number;
  sigma_start: number;
  sigma_end: number;
  rescale: number;
  rescale_mode: "full" | "partial" | "snf";
};

const PerturbedAttentionGuidanceFields = ({
  control,
}: {
  control: Control<MainFormValues>;
}) => {
  return (
    <FieldsSection<PerturbedAttentionGuidanceArgs>
      control={control}
      label="Perturbed Attention Guidance"
      parentFieldName="perturbedAttentionGuidance"
      fields={perturbedAttentionGuidanceFields}
    />
  );
};

export default PerturbedAttentionGuidanceFields;
