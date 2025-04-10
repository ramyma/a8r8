import { Control } from "react-hook-form";
import { selfAttentionGuidanceFields } from "./constants";
import { MainFormValues } from "../MainForm";
import FieldsSection from "../FieldsSection/FieldsSections";

export type SelfAttentionGuidanceArgs = {
  is_enabled: boolean;
  scale: number;
  blur_sigma: number;
};

const SelfAttentionGuidanceFields = ({
  control,
}: {
  control: Control<MainFormValues>;
}) => {
  return (
    <FieldsSection<SelfAttentionGuidanceArgs>
      control={control}
      label="Self Attention Guidnace"
      parentFieldName="selfAttentionGuidance"
      fields={selfAttentionGuidanceFields}
    />
  );
};

export default SelfAttentionGuidanceFields;
