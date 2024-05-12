import React, { MutableRefObject, forwardRef } from "react";
import { twMerge } from "tailwind-merge";

export type ButtonProps = {
  fullWidth?: boolean;
  /**
   * @default "filled"
   */
  variant?: "clear" | "filled";
} & React.ComponentProps<"button">;

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = "",
      fullWidth = false,
      variant = "filled",
      ...props
    },
    ref
  ) => {
    return (
      <button
        className={twMerge(
          `rounded ${variant === "filled" ? "border border-neutral-700/95 enabled:hover:border-neutral-500 bg-neutral-800/90 backdrop-blur-sm" : "border-none !bg-transparent"} enabled:hover:bg-neutral-700/80 p-2.5 ${fullWidth ? "w-full" : "w-fit"} hover:text-neutral-300 bg-neutral-900/60 flex justify-center rounded-md disabled:text-neutral-500 disabled:cursor-not-allowed transition-colors duration-300 ease-in-out place-items-center`,
          className
        )}
        {...props}
        ref={ref}
      >
        {children}
      </button>
    );
  }
);

export default Button;
