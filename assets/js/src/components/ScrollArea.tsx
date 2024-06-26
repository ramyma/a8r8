import React, { PropsWithoutRef, ReactNode, Ref, forwardRef } from "react";
import * as RadixScrollArea from "@radix-ui/react-scroll-area";
import { twMerge } from "tailwind-merge";
interface Props extends RadixScrollArea.ScrollAreaProps {
  children: ReactNode;
  className?: string;
  viewportProps?: PropsWithoutRef<RadixScrollArea.ScrollAreaViewportProps>;
}
const ScrollArea = forwardRef(
  (
    { children, className = "", viewportProps, ...rest }: Props,
    ref: Ref<HTMLDivElement>
  ) => (
    <RadixScrollArea.Root
      className={twMerge("w-full h-full rounded", className)}
      {...rest}
    >
      <RadixScrollArea.Viewport
        className="w-full h-full rounded [&>div]:!block"
        ref={ref}
        {...viewportProps}
      >
        {children}
      </RadixScrollArea.Viewport>
      <RadixScrollArea.Scrollbar
        className="flex select-none touch-none p-0.5 rounded bg-neutral-900 transition-colors duration-[160ms] ease-out hover:bg-neutral-800 data-[orientation=vertical]:w-2.5 data-[orientation=horizontal]:flex-col data-[orientation=horizontal]:h-2.5"
        orientation="vertical"
      >
        <RadixScrollArea.Thumb className="flex-1 bg-neutral-700 rounded-[10px] relative before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-full before:h-full before:min-w-[44px] before:min-h-[44px]" />
      </RadixScrollArea.Scrollbar>
      <RadixScrollArea.Scrollbar
        className="flex select-none touch-none p-0.5 bg-blackA6 transition-colors duration-[160ms] ease-out hover:bg-blackA8 data-[orientation=vertical]:w-2.5 data-[orientation=horizontal]:flex-col data-[orientation=horizontal]:h-2.5"
        orientation="horizontal"
      >
        <RadixScrollArea.Thumb className="flex-1 bg-mauve10 rounded-[10px] relative before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-full before:h-full before:min-w-[44px] before:min-h-[44px]" />
      </RadixScrollArea.Scrollbar>
      <RadixScrollArea.Corner className="bg-blackA8" />
    </RadixScrollArea.Root>
  )
);

ScrollArea.displayName = "ScrollArea";

export default ScrollArea;
