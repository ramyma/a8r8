import { Control, Controller } from "react-hook-form";
import { comfySoftPaintingFields } from "./constants";
import { MainFormValues } from "../MainForm";
import FieldsSection from "../FieldsSection/FieldsSections";

export type ComfySoftInpaintingArgs = {
  isEnabled: boolean;
  maskBlur: number;
};

const SoftInpaintingFields = ({
  control,
}: {
  control: Control<MainFormValues>;
}) => {
  return (
    <FieldsSection<ComfySoftInpaintingArgs>
      control={control}
      label="Soft Inpainting"
      parentFieldName="comfySoftInpainting"
      fields={comfySoftPaintingFields}
      expandCollapseProps={{ showCheckbox: false }}
    />
  );
};

export default SoftInpaintingFields;
