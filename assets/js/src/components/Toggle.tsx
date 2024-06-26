import React, { JSXElementConstructor, MouseEvent, forwardRef } from "react";
import * as RadixToggle from "@radix-ui/react-toggle";
import { twMerge } from "tailwind-merge";

type Props = {
  pressed?: boolean;
  value?: boolean;
  title?: string;
  onChange: (pressed: boolean) => void;
  preventClickPropagation?: boolean;
  pressedIconComponent: JSXElementConstructor<any>;
  unpressedIconComponent: JSXElementConstructor<any>;
  className?: string;
};
const Toggle = forwardRef(
  (
    {
      pressed,
      title,
      value,
      className = "",
      preventClickPropagation = true,
      pressedIconComponent: PressedIconComponent,
      unpressedIconComponent: UnpressedIconComponent,
      onChange,
      ...rest
    }: Props,
    _ref
  ) => (
    <RadixToggle.Root
      aria-label="Toggle italic"
      className={twMerge(
        "flex size-[35px] items-center justify-center rounded text-base leading-4 p-0 data-[state=on]:text-primary border-none bg-transparent transition-colors",
        className
      )}
      pressed={pressed ?? value}
      onPressedChange={onChange}
      title={title}
      {...(preventClickPropagation && {
        onClick: (e: MouseEvent) => {
          e.stopPropagation();
        },
      })}
      {...rest}
    >
      {pressed ?? value ? <PressedIconComponent /> : <UnpressedIconComponent />}
    </RadixToggle.Root>
  )
);
Toggle.displayName = "Toggle";

export default Toggle;
