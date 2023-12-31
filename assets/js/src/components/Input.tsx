import React, { InputHTMLAttributes, Ref, forwardRef } from "react";

type Props = InputHTMLAttributes<HTMLInputElement>;

const Input = forwardRef(
  ({ className, ...rest }: Props, ref: Ref<HTMLInputElement>) => {
    return (
      <input
        className={
          "rounded flex-1 p-1 px-2 w-full h-fit text-neutral-200 bg-neutral-800/80 hover:bg-neutral-700/80 border border-neutral-700 transition-colors duration-300 text-sm" +
          (className ? " " + className : "")
        }
        {...rest}
        ref={ref}
      />
    );
  }
);

Input.displayName = "Input";

export default Input;
