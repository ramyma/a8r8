import React, { InputHTMLAttributes, forwardRef } from "react";

const Input = forwardRef(
  ({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>, _ref) => {
    return (
      <input
        className={
          "rounded flex-1 p-1 px-2 w-full h-fit text-neutral-200 bg-neutral-800/80 hover:bg-neutral-700/80 border border-neutral-700 text-sm" +
          (className ? " " + className : "")
        }
        {...rest}
      />
    );
  }
);

Input.displayName = "Input";

export default Input;
