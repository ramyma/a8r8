import { Control, Controller } from "react-hook-form";
import { skimmedCfgFields } from "./constants";
import Slider from "../../components/Slider";
import ExpandCollapseCheckbox from "../../components/ExpandCollapseCheckbox";
import Checkbox from "../../components/Checkbox";
import { MainFormValues } from "../MainForm";

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
    <div className="flex flex-col gap-3">
      <Controller
        name="skimmedCfg.is_enabled"
        control={control}
        defaultValue={false}
        render={({ field }) => (
          <ExpandCollapseCheckbox {...field} label="Skimmed CFG">
            <div className="h-auto flex relative flex-col gap-8 bg-neutral-100/5 p-4 rounded-md overflow-hidden">
              {skimmedCfgFields?.map(
                ({ value: defaultValue, type, ...rest }) => (
                  <div key={rest.name}>
                    <Controller
                      name={"skimmedCfg." + rest.name}
                      control={control}
                      render={({ field }) =>
                        type === "range" ? (
                          <Slider {...rest} {...field} />
                        ) : (
                          <Checkbox {...rest} {...field}>
                            {rest.label}
                          </Checkbox>
                        )
                      }
                      defaultValue={defaultValue}
                    />
                  </div>
                )
              )}
            </div>
          </ExpandCollapseCheckbox>
        )}
      />
    </div>
  );
};

export default SkimmedCfgFields;
