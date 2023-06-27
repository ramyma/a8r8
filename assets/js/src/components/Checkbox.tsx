import React, { forwardRef, Ref } from "react";
import * as RadixCheckbox from "@radix-ui/react-checkbox";
import { CheckIcon } from "@radix-ui/react-icons";
import Label from "./Label";

interface Props {
  id?: string;
  value?: boolean;
  onChange?: (value: boolean) => void;
}

const Checkbox = forwardRef(
  (
    { id, children, onChange, ...rest }: Props & RadixCheckbox.CheckboxProps,
    _ref: Ref<HTMLInputElement>
  ) => (
    <div className="flex items-center gap-4 justify-between">
      {children && (
        <Label className="Label" htmlFor={id}>
          {children}
        </Label>
      )}
      <RadixCheckbox.Root
        className="w-8 h-8 flex items-center  justify-center  bg-neutral-900 p-0 rounded bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700"
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
  )
);

Checkbox.displayName = "Checkbox";
export default Checkbox;
