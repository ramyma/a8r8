import { PropsWithoutRef, ReactNode, Ref, forwardRef } from "react";
import { ScrollArea as RadixScrollArea } from "radix-ui";
import { twMerge } from "tailwind-merge";
interface Props extends RadixScrollArea.ScrollAreaProps {
  children: ReactNode;
  className?: string;
  viewportProps?: PropsWithoutRef<RadixScrollArea.ScrollAreaViewportProps>;
  disable?: boolean;
  orientation?: "horizontal" | "vertical" | "both";
  scroll?: boolean;
  scrollBarClassNames?: string;
}
const ScrollArea = forwardRef(
  (
    {
      children,
      className = "",
      viewportProps,
      disable = false,
      orientation = "vertical",
      scroll = true,
      scrollBarClassNames = "",
      ...rest
    }: Props,
    ref: Ref<HTMLDivElement>
  ) =>
    scroll ? (
      <RadixScrollArea.Root
        className={twMerge("w-full h-full flex-1 rounded-xs", className)}
        {...rest}
      >
        <RadixScrollArea.Viewport
          className="size-full rounded-xs min-w-[auto]! *:block!"
          ref={ref}
          {...viewportProps}
        >
          {children}
        </RadixScrollArea.Viewport>
        {!disable && (
          <>
            {(orientation == "vertical" || orientation == "both") && (
              <RadixScrollArea.Scrollbar
                className={twMerge(
                  "flex select-none touch-none p-0.5 rounded-xs bg-neutral-900/60 transition-colors duration-[160ms] ease-out hover:bg-neutral-800/50 data-[orientation=vertical]:w-2.5 data-[orientation=horizontal]:flex-col data-[orientation=horizontal]:h-2.5",
                  scrollBarClassNames
                )}
                orientation="vertical"
              >
                <RadixScrollArea.Thumb className="flex-1 bg-neutral-700 rounded-[10px] relative before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-full before:h-full before:min-w-[44px] before:min-h-[44px]" />
              </RadixScrollArea.Scrollbar>
            )}
            {(orientation == "horizontal" || orientation == "both") && (
              <RadixScrollArea.Scrollbar
                className="flex select-none touch-none p-0.5 bg-blackA6 transition-colors duration-[160ms] ease-out hover:bg-blackA8 data-[orientation=horizontal]:w-2.5 data-[orientation=horizontal]:flex-col data-[orientation=horizontal]:h-2.5 z-10"
                orientation="horizontal"
              >
                <RadixScrollArea.Thumb className="flex-1 bg-mauve10 rounded-[10px] relative before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-full before:h-full before:min-w-[44px] before:min-h-[44px]" />
              </RadixScrollArea.Scrollbar>
            )}
          </>
        )}
        <RadixScrollArea.Corner className="bg-blackA8" />
      </RadixScrollArea.Root>
    ) : (
      children
    )
);

ScrollArea.displayName = "ScrollArea";

export default ScrollArea;
