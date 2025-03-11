import { CrossCircledIcon } from "@radix-ui/react-icons";
import React, { MouseEventHandler, RefObject, forwardRef, useRef } from "react";
import { twMerge } from "tailwind-merge";
import Button from "./Button";

type Props = {
  fullWidth?: boolean;
  onClear?: MouseEventHandler;
} & React.ComponentProps<"input">;

const Input = forwardRef<HTMLInputElement, Props>(
  ({ className = "", fullWidth = false, onClear, ...rest }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const handleClearClick: MouseEventHandler = (event) => {
      onClear?.(event);
      ((ref ?? inputRef) as RefObject<HTMLInputElement>).current?.focus();
    };
    return (
      <div
        className={`relative flex place-items-center ${fullWidth ? "w-full" : "w-fit"}`}
      >
        <input
          className={twMerge(
            `rounded-sm p-1 px-2 w-full text-neutral-200 disabled:text-neutral-700 bg-neutral-800/80 enabled:hover:bg-neutral-700/80 border border-neutral-700 transition-colors duration-300 text-sm enabled:placeholder:text-neutral-400`,
            className
          )}
          {...rest}
          ref={ref || inputRef}
        />
        {onClear && rest.value && (
          <div className="absolute end-0 top-0 flex h-full place-items-center">
            <Button
              variant="clear"
              className="rounded-full focus:outline-hidden enabled:text-neutral-400 enabled:hover:text-neutral-100"
              tabIndex={-1}
              onClick={handleClearClick}
              disabled={rest.disabled}
              aria-label="clear"
            >
              <CrossCircledIcon className="size-5" />
            </Button>
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
