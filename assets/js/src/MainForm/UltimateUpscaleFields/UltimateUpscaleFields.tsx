import { Control, UseFormSetValue, useWatch } from "react-hook-form";
import { MainFormValues } from "../MainForm";
import FieldsSection from "../FieldsSection/FieldsSections";
import { OptionsState } from "../../state/optionsSlice";
import { ultimateUpscaleFields } from "./constants";

export type UltimateUpscaleArgs = {
  is_enabled: boolean;
  mode_type: string;
  tile_width: number;
  tile_height: number;
  mask_blur: number;
  tile_padding: number;
  seam_fix_mode: string;
  seam_fix_denoise: number;
  seam_fix_width: number;
  seam_fix_mask_blur: number;
  seam_fix_padding: number;
  force_uniform_tiles: boolean;
  tiled_decode: boolean;
};
export type UltimateUpscaleFieldsExtras = {
  model: OptionsState["selectedModel"];
};

const UltimateUpscaleFields = ({
  control,
  setValue,
  model,
}: {
  control: Control<MainFormValues>;
  setValue: UseFormSetValue<MainFormValues>;
  model: OptionsState["selectedModel"];
}) => {
  const upscaler = useWatch({ control, name: "upscaler" });

  return (
    <FieldsSection<UltimateUpscaleArgs, UltimateUpscaleFieldsExtras>
      control={control}
      label="Ultimate Upscale"
      parentFieldName="ultimateUpscale"
      fields={ultimateUpscaleFields}
      fieldsExtras={{ model }}
      checkBoxControllerProps={{
        rules: {
          onChange: (e) => {
            const value = e.target.value;
            if (value) {
              setValue("tiledDiffusion.is_enabled", false);
              if (upscaler === "Latent") setValue("upscaler", "None");
            }
          },
        },
      }}
    />
  );
};

export default UltimateUpscaleFields;
