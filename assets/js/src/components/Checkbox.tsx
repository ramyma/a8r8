import { forwardRef, useId } from "react";
import * as RadixCheckbox from "@radix-ui/react-checkbox";
import { CheckIcon } from "@radix-ui/react-icons";
import Label from "./Label";

interface Props {
  value?: boolean;
  onChange?: (value: boolean) => void;
}

const Checkbox = forwardRef<
  React.ElementRef<typeof RadixCheckbox.Root>,
  Props & Omit<RadixCheckbox.CheckboxProps, "id" | "value">
>(({ children, onChange, value, ...rest }, _ref) => {
  const id = useId();

  return (
    <div className="group flex items-start md:items-center gap-4 justify-between flex-col md:flex-row">
      {children && (
        <Label
          className="Label select-none cursor-pointer group-hover:text-neutral-200 transition-colors"
          htmlFor={id}
        >
          {children}
        </Label>
      )}
      <RadixCheckbox.Root
        className="w-6 h-6 shrink-0 flex items-center  justify-center bg-neutral-900 p-0 rounded bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700"
        onCheckedChange={onChange}
        id={id}
        value={value as RadixCheckbox.CheckboxProps["value"]}
        checked={value}
        {...rest}
      >
        <RadixCheckbox.Indicator className="text-primary">
          <CheckIcon />
        </RadixCheckbox.Indicator>
      </RadixCheckbox.Root>
    </div>
  );
});

Checkbox.displayName = "Checkbox";
export default Checkbox;
