import { forwardRef } from "react";
import { twMerge } from "tailwind-merge";

export type ButtonProps = {
  fullWidth?: boolean;
  /**
   * @default "filled"
   */
  variant?: "clear" | "filled";
  loading?: boolean;
} & React.ComponentProps<"button">;

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = "",
      fullWidth = false,
      variant = "filled",
      type = "button",
      loading = false,
      onClick,
      ...props
    },
    ref
  ) => {
    return (
      <button
        className={twMerge(
          `rounded-sm ${variant === "filled" ? "border border-neutral-700/80 disabled:border-neutral-900/70 enabled:not-data-loading:hover:border-neutral-700/80 bg-neutral-800/90 backdrop-blur-xs" : "border-none bg-transparent!"} enabled:hover:bg-neutral-700/80 p-2.5 ${fullWidth ? "w-full" : "w-fit"} not-data-loading:enabled:hover:text-neutral-300 bg-neutral-900/60 flex justify-center rounded-sm disabled:text-neutral-500 disabled:cursor-not-allowed transition-colors duration-300 ease-in-out place-items-center select-none data-loading:bg-clip-text data-loading:bg-radial-[circle_at_50%] data-loading:bg-[length:200%] data-loading:to-white data-loading:via-neutral-500 data-loading:from-white data-loading:text-transparent data-loading:animate-text-loading data-loading:cursor-wait data-loading:border-neutral-800`,
          className
        )}
        data-loading={loading || undefined}
        onClick={!loading ? onClick : undefined}
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
