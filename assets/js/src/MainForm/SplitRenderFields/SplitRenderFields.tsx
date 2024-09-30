import { Control, Controller } from "react-hook-form";
import { splitRenderFields } from "./constants";
import Slider from "../../components/Slider";
import ExpandCollapseCheckbox from "../../components/ExpandCollapseCheckbox";
import Checkbox from "../../components/Checkbox";
import { MainFormValues } from "../MainForm";

export type SplitRenderArgs = {
  is_enabled: boolean;
  split_ratio: number;
  noise_injection_strength: number;
};

const SplitRenderFields = ({
  control,
}: {
  control: Control<SplitRenderArgs>;
}) => {
  return (
    <div className="flex flex-col gap-3">
      <Controller
        name="splitRender.is_enabled"
        control={control}
        defaultValue={false}
        render={({ field }) => (
          <ExpandCollapseCheckbox {...field} label="Split Render">
            <div className="h-auto flex relative flex-col gap-8 bg-neutral-100/5 p-4 rounded-md overflow-hidden">
              {splitRenderFields?.map(
                ({ value: defaultValue, type, ...rest }) => (
                  <div key={rest.name}>
                    <Controller
                      name={"splitRender." + rest.name}
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

export default SplitRenderFields;
