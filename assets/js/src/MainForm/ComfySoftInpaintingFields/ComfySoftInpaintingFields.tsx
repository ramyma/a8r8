import { Control, Controller } from "react-hook-form";
import { comfySoftPaintingFields } from "./constants";
import Slider from "../../components/Slider";
import ExpandCollapseCheckbox from "../../components/ExpandCollapseCheckbox";
import { MainFormValues } from "../MainForm";

export type ComfySoftInpaintingArgs = {
  maskBlur: number;
};

const SoftInpaintingFields = ({
  control,
}: {
  control: Control<MainFormValues>;
}) => {
  return (
    <div className="flex flex-col gap-3">
      <ExpandCollapseCheckbox showCheckbox={false} label="Soft Inpainting">
        <div className="h-auto flex relative flex-col gap-8 bg-neutral-100/5 p-4 rounded-md overflow-hidden">
          {comfySoftPaintingFields?.map(({ value: defaultValue, ...rest }) => (
            <div key={rest.name}>
              <Controller
                name={"comfySoftInpainting." + rest.name}
                control={control}
                render={({ field }) => <Slider {...rest} {...field} />}
                defaultValue={defaultValue}
              />
            </div>
          ))}
        </div>
      </ExpandCollapseCheckbox>
    </div>
  );
};

export default SoftInpaintingFields;
