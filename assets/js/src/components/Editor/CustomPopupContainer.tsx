import { FC } from "react";
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

  // TODO: scroll to highlighted item

  return (
    <FloatingWrapper
      positioner="cursor"
      enabled={enabled}
      placement="bottom-end"
      renderOutsideEditor
      blurOnInactive={false}
      containerClass="z-20"
    >
      <ScrollArea className="bg-neutral-900/90 border border-neutral-700 backdrop-blur-xs rounded-sm text-sm shadow-md shadow-black">
        <ul {...getMenuProps()} className={"max-h-96 max-w-72"}>
          {enabled &&
            (state?.list ?? emptyList).map((extra, index) => {
              const isHighlighted = indexIsSelected(index);
              const isHovered = indexIsHovered(index);
              const text =
                typeof extra === "object" ? extra.alias || extra.name : extra;
              return (
                <li
                  key={typeof extra === "object" ? extra.path : extra}
                  className={`p-1 px-2 data-[state=checked]:text-primary overflow-ellipsis overflow-hidden text-nowrap select-none  ${
                    isHighlighted || isHovered
                      ? "text-neutral-900 bg-neutral-200 "
                      : ""
                  }`}
                  {...getItemProps({
                    item: extra,
                    index,
                  })}
                  title={text}
                >
                  <span
                    className={
                      isHighlighted || isHovered
                        ? "text-neutral-900 bg-neutral-200 "
                        : "text-white"
                    }
                  >
                    {text}
                  </span>
                </li>
              );
            })}
        </ul>
      </ScrollArea>
    </FloatingWrapper>
  );
};
