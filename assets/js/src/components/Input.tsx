import React, { InputHTMLAttributes, Ref, forwardRef } from "react";
import { twMerge } from "tailwind-merge";

type Props = { fullWidth?: boolean } & React.ComponentProps<"input">;

const Input = forwardRef(
  (
    { className = "", fullWidth = false, ...rest }: Props,
    ref: Ref<HTMLInputElement>
  ) => {
    return (
      <input
        className={twMerge(
          `rounded p-1 px-2 ${fullWidth ? "w-full" : "w-fit"} h-fit text-neutral-200 disabled:text-neutral-700 bg-neutral-800/80 enabled:hover:bg-neutral-700/80 border border-neutral-700 transition-colors duration-300 text-sm`,
          className
        )}
        {...rest}
        ref={ref}
      />
    );
  }
);

Input.displayName = "Input";

export default Input;
