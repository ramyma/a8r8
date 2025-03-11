import React, {
  PropsWithChildren,
  ReactElement,
  ReactNode,
  useState,
} from "react";
import * as RadixPopover from "@radix-ui/react-popover";
import {
  Cross2Icon,
  MixerHorizontalIcon,
  PlusIcon,
} from "@radix-ui/react-icons";
import Button from "./Button";
import { AnimatePresence, motion } from "motion/react";
import { twMerge } from "tailwind-merge";
interface Props extends PropsWithChildren {
  trigger?: ReactElement;
  autoFocusOnOpen?: boolean;
  contentClassName?: HTMLElement["className"];
}

const Popover = ({
  children,
  trigger,
  autoFocusOnOpen = true,
  contentClassName = "",
}: Props) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <RadixPopover.Root open={isVisible} onOpenChange={setIsVisible}>
      <RadixPopover.Trigger
        asChild
        // onClick={(e) => {
        //   e.preventDefault();
        //   e.stopPropagation();
        //   // setIsVisible((state) => !state);
        //   if (!isVisible) setIsVisible(true);
        // }}
      >
        {trigger ? (
          trigger
        ) : (
          <Button
            className="p-1 size-7 "
            title="Add controlnet layer"
            // onClick={handleAddLayer}
          >
            <PlusIcon />
          </Button>
        )}
      </RadixPopover.Trigger>
      <AnimatePresence>
        {isVisible && (
          <RadixPopover.Portal>
            <RadixPopover.Content
              sideOffset={5}
              {...(!autoFocusOnOpen && {
                onOpenAutoFocus: (e) => e.preventDefault(),
              })}
            >
              <motion.div
                className={twMerge(
                  "rounded backdrop-blur-xs p-3 w-fit max-w-[260px] bg-neutral-950/90 border border-neutral-900  will-change-[transform,opacity] z-20 shadow-lg shadow-black/30",
                  contentClassName
                )}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, filter: "blur(2px)" }}
                transition={{ duration: 0.1 }}
              >
                {children}

                {/* <RadixPopover.Close
                  className="rounded-md h-[25px] w-[25px] p-0 inline-flex items-center justify-center text-violet11 absolute top-[5px] right-[5px] hover:bg-violet4 focus:shadow-[0_0_0_2px] focus:shadow-violet7 outline-hidden cursor-default"
                  aria-label="Close"
                >
                  <Cross2Icon />
                </RadixPopover.Close> */}
                <RadixPopover.Arrow className="fill-neutral-700/90" />
              </motion.div>
            </RadixPopover.Content>
          </RadixPopover.Portal>
        )}
      </AnimatePresence>
    </RadixPopover.Root>
  );
};

Popover.Close = RadixPopover.Close;

export default Popover;
