import React, { LabelHTMLAttributes } from "react";

function Label({
  children,
  className,
  ...rest
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={"text-sm font-bold" + (className ? " " + className : "")}
      {...rest}
    >
      {children}
    </label>
  );
}

export default Label;
