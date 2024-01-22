import React, { forwardRef, useId } from "react";
import * as RadixCheckbox from "@radix-ui/react-checkbox";
import { CheckIcon } from "@radix-ui/react-icons";
import Label from "./Label";

interface Props {
  value?: boolean;
  onChange?: (value: boolean) => void;
}

const Checkbox = forwardRef<
  React.ElementRef<typeof RadixCheckbox.Root>,
  Props & Omit<RadixCheckbox.CheckboxProps, "id">
>(({ children, onChange, ...rest }, _ref) => {
  const id = useId();

  return (
    <div className="flex items-start md:items-center gap-4 justify-between flex-col md:flex-row">
      {children && (
        <Label className="Label select-none" htmlFor={id}>
          {children}
        </Label>
      )}
      <RadixCheckbox.Root
        className="w-8 h-8 shrink-0 flex items-center  justify-center bg-neutral-900 p-0 rounded bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700"
        onCheckedChange={onChange}
        id={id}
        checked={rest.value}
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
