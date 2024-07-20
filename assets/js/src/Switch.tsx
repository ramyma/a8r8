import * as RadixSwitch from "@radix-ui/react-switch";
import Label from "./components/Label";
import { forwardRef, PropsWithChildren, useId } from "react";
import { twMerge } from "tailwind-merge";

type Props = PropsWithChildren &
  Omit<RadixSwitch.SwitchProps, "id" | "onChange"> & {
    onChange: RadixSwitch.SwitchProps["onCheckedChange"];
  };

const Switch = forwardRef<React.ElementRef<typeof RadixSwitch.Root>, Props>(
  ({ children, className = "", onChange, ...props }, ref) => {
    const id = useId();

    const handleChange: RadixSwitch.SwitchProps["onCheckedChange"] = (
      checked
    ) => {
      onChange?.(checked);
    };
    return (
      <div className="flex w-full justify-between">
        <Label htmlFor={id} className="cursor-pointer">
          {children}
        </Label>
        <RadixSwitch.Root
          id={id}
          {...props}
          className={twMerge(
            "w-[42px] h-[25px] bg-neutral-800 border border-neutral-700 relative data-[state=checked]:bg-primary outline-none rounded-md cursor-pointer",
            className
          )}
          ref={ref}
          onCheckedChange={handleChange}
        >
          <RadixSwitch.Thumb className="block w-[21px] h-[21px] bg-white rounded-md transition-transform duration-100 translate-x-0 will-change-transform data-[state=checked]:translate-x-[20px]" />
        </RadixSwitch.Root>
      </div>
    );
  }
);

Switch.displayName = "Switch";

export default Switch;
