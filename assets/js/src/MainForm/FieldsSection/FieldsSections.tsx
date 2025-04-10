import {
  Control,
  Controller,
  ControllerProps,
  useWatch,
} from "react-hook-form";
import { FieldsType, MainFormValues } from "../MainForm";
import ExpandCollapseCheckbox, {
  ExpandCollapseCheckboxProps,
} from "../../components/ExpandCollapseCheckbox";
import Slider from "../../components/Slider";
import Checkbox from "../../components/Checkbox";
import Select from "../../components/Select";
import Label from "../../components/Label";

export type FieldsSectionFunc<T, X = Record<string, unknown>> = (
  formData: ReturnType<typeof useWatch<MainFormValues>>,
  fieldsExtras?: X
) => FieldsType<T>;

type FieldsSectionProps<T, X = Record<string, unknown>> = {
  label: string;
  parentFieldName: keyof MainFormValues;
  control: Control<MainFormValues>;
  fields: FieldsType<T> | FieldsSectionFunc<T, X>;
  fieldsExtras?: X;
  expandCollapseProps?: Partial<Omit<ExpandCollapseCheckboxProps, "children">>;
  checkBoxControllerProps?: Partial<Omit<ControllerProps, "control">>;
};

function FieldsSection<T, X = Record<string, unknown>>({
  label,
  control,
  fields,
  fieldsExtras,
  expandCollapseProps,
  parentFieldName,
  checkBoxControllerProps,
}: FieldsSectionProps<T, X>) {
  const formData = useWatch({ control });
  fields =
    typeof fields == "function" ? fields(formData, fieldsExtras) : fields;

  return (
    <div className="flex flex-col gap-3">
      <Controller
        name={parentFieldName + "." + "is_enabled"}
        control={control}
        defaultValue={false}
        render={({ field }) => (
          <ExpandCollapseCheckbox
            {...field}
            label={label}
            {...expandCollapseProps}
          >
            <div className="h-auto flex relative flex-col gap-4 bg-neutral-100/5 p-4 rounded-sm overflow-hidden">
              {fields?.map(({ value: defaultValue, type, ...rest }) => (
                <div key={rest.name as string}>
                  <Controller
                    name={parentFieldName + "." + (rest.name as string)}
                    control={control}
                    render={({ field }) =>
                      type === "range" ? (
                        <Slider
                          defaultValue={defaultValue}
                          {...rest}
                          {...field}
                        />
                      ) : type === "select" ? (
                        <div className="flex flex-row gap-2 items-center justify-between">
                          <Label className="w-full">{rest.label}</Label>
                          <Select {...rest} {...field} />
                        </div>
                      ) : (
                        <Checkbox {...rest} {...field}>
                          {rest.label}
                        </Checkbox>
                      )
                    }
                    defaultValue={defaultValue}
                  />
                </div>
              ))}
            </div>
          </ExpandCollapseCheckbox>
        )}
        {...checkBoxControllerProps}
      />
    </div>
  );
}

export default FieldsSection;
