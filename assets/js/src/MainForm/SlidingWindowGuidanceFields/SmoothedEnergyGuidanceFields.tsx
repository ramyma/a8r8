import { Control } from "react-hook-form";
import { slidingWindowGuidanceFields } from "./constants";
import { MainFormValues } from "../MainForm";
import FieldsSection from "../FieldsSection/FieldsSections";

export type SlidingWindowGuidanceArgs = {
  is_enabled: boolean;
  scale: number;
  tile_width: number;
  tile_height: number;
  tile_overlap: number;
  sigma_start: number;
  sigma_end: number;
};

const SlidingWindowGuidanceFields = ({
  control,
}: {
  control: Control<MainFormValues>;
}) => {
  return (
    <FieldsSection<SlidingWindowGuidanceArgs>
      control={control}
      label="Sliding Window Guidance"
      parentFieldName="slidingWindowGuidance"
      fields={slidingWindowGuidanceFields}
    />
  );
};

export default SlidingWindowGuidanceFields;
