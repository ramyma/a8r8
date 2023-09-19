import React, { FC } from "react";
import { FloatingWrapper } from "@remirror/react";
import { useExtras } from "./useExtras";
import ScrollArea from "../ScrollArea";

const emptyList: never[] = [];

/**
 * This component renders the extras suggestion dropdown for the user.
 */
export const CustomPopupComponent: FC = () => {
  const { state, getMenuProps, getItemProps, indexIsHovered, indexIsSelected } =
    useExtras();
  const enabled = !!state;

  if (state?.exit) {
    return null;
  }

  return (
    <FloatingWrapper
      positioner="cursor"
      enabled={enabled}
      placement="auto-end"
      renderOutsideEditor
      blurOnInactive={false}
      containerClass="z-20"
    >
      <ScrollArea classNames="bg-neutral-900/95 border border-neutral-700 backdrop-blur-sm rounded text-sm shadow-md shadow-black">
        <div {...getMenuProps()} className={"max-h-96"}>
          {enabled &&
            (state?.list ?? emptyList).map((extra, index) => {
              const isHighlighted = indexIsSelected(index);
              const isHovered = indexIsHovered(index);

              return (
                <div
                  key={extra}
                  className={
                    "p-1 px-2 data-[state=checked]:text-primary select-none " +
                    (isHighlighted || isHovered
                      ? "text-neutral-900 bg-neutral-200 "
                      : "")
                  }
                  {...getItemProps({
                    item: extra,
                    index,
                  })}
                >
                  <span
                    className={
                      isHighlighted || isHovered
                        ? "text-neutral-900 bg-neutral-200 "
                        : "text-white"
                    }
                  >
                    {extra}
                  </span>
                </div>
              );
            })}
        </div>
      </ScrollArea>
    </FloatingWrapper>
  );
};
