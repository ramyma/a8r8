import { Control } from "react-hook-form";
import { splitRenderFields } from "./constants";
import { MainFormValues } from "../MainForm";
import FieldsSection from "../FieldsSection/FieldsSections";

export type SplitRenderArgs = {
  is_enabled: boolean;
  split_ratio: number;
  noise_injection_strength: number;
};

const SplitRenderFields = ({
  control,
}: {
  control: Control<MainFormValues>;
}) => {
  return (
    <FieldsSection<SplitRenderArgs>
      control={control}
      label="Split Render"
      parentFieldName="splitRender"
      fields={splitRenderFields}
    />
  );
};

export default SplitRenderFields;
