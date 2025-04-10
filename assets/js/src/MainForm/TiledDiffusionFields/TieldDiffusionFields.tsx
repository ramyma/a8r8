import { Control, UseFormSetValue, useWatch } from "react-hook-form";
import { tiledDiffusionFields } from "./constants";
import { MainFormValues } from "../MainForm";
import FieldsSection from "../FieldsSection/FieldsSections";
import { OptionsState } from "../../state/optionsSlice";

export type TiledDiffusionArgs = {
  is_enabled: boolean;
  method: string;
  tile_width: number;
  tile_height: number;
  tile_overlap: number;
  tile_batch_size: number;
};

export type TiledDiffusionFieldsExtras = {
  model: OptionsState["selectedModel"];
};

const TiledDiffusionFields = ({
  control,
  setValue,
  model,
}: {
  control: Control<MainFormValues>;
  setValue: UseFormSetValue<MainFormValues>;
  model: OptionsState["selectedModel"];
}) => {
  return (
    <FieldsSection<TiledDiffusionArgs, TiledDiffusionFieldsExtras>
      control={control}
      label="Tiled Diffusion"
      parentFieldName="tiledDiffusion"
      fields={tiledDiffusionFields}
      fieldsExtras={{ model }}
      checkBoxControllerProps={{
        rules: {
          onChange: (e) => {
            const value = e.target.value;
            if (value) {
              setValue("ultimateUpscale.is_enabled", false);
            }
          },
        },
      }}
    />
  );
};

export default TiledDiffusionFields;
