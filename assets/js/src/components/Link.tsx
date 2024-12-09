import { ComponentProps, MouseEventHandler } from "react";
import { twMerge } from "tailwind-merge";

type LinkProps = {
  onClick?: MouseEventHandler;
  disabled?: boolean;
  external?: boolean;
} & ComponentProps<"a">;

const Link = ({
  onClick,
  children,
  className,
  disabled,
  external,
  ...rest
}: LinkProps) => {
  const handleClick = (event) => {
    if (!disabled) onClick?.(event);
  };
  return (
    <a
      className={twMerge(
        "font-[500] aria-disabled:text-neutral-700 text-primary hover:text-orange-500 aria-disabled:cursor-not-allowed cursor-pointer select-none transition-colors",
        className
      )}
      aria-disabled={disabled}
      onClick={handleClick}
      {...(external && { rel: "noreferrer", target: "_blank" })}
      {...rest}
    >
      {children}
    </a>
  );
};

export default Link;
