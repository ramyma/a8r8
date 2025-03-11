import { forwardRef } from "react";
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
      type = "button",
      ...props
    },
    ref
  ) => {
    return (
      <button
        className={twMerge(
          `rounded-sm ${variant === "filled" ? "border border-neutral-700/80 disabled:border-neutral-900/70 enabled:hover:border-neutral-700/80 bg-neutral-800/90 backdrop-blur-xs" : "border-none bg-transparent!"} enabled:hover:bg-neutral-700/80 p-2.5 ${fullWidth ? "w-full" : "w-fit"} hover:text-neutral-300 bg-neutral-900/60 flex justify-center rounded-sm disabled:text-neutral-500 disabled:cursor-not-allowed transition-colors duration-300 ease-in-out place-items-center select-none`,
          className
        )}
        {...props}
        type={type}
        ref={ref}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
