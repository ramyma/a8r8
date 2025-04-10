import React, { LabelHTMLAttributes } from "react";

function Label({
  children,
  className,
  disabled,
  ...rest
}: LabelHTMLAttributes<HTMLLabelElement> & { disabled?: boolean }) {
  return (
    <label
      className={
        `text-xs font-bold transition-colors ${disabled ? "text-neutral-500" : ""}` +
        (className ? " " + className : "")
      }
      {...rest}
    >
      {children}
    </label>
  );
}

export default Label;
