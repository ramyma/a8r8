import React, { ReactNode } from "react";
import * as RadixPopover from "@radix-ui/react-popover";
import { Cross2Icon, MixerHorizontalIcon } from "@radix-ui/react-icons";

interface Props {
  children: ReactNode[] | ReactNode;
}

const Popover = ({ children }: Props) => {
  return (
    <RadixPopover.Root>
      <RadixPopover.Trigger asChild>
        <button
          className="rounded-md w-[35px] h-[35px] inline-flex items-center justify-center text-white bg-neutral-800 border border-neutral-700   cursor-default outline-none p-0"
          aria-label="Update dimensions"
        >
          <MixerHorizontalIcon />
        </button>
      </RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          className="rounded backdrop-blur-sm p-4 pt-8 w-[260px] bg-neutral-900/90 border border-neutral-800  will-change-[transform,opacity] z-20 shadow-lg shadow-black/25"
          sideOffset={5}
        >
          {children}
          <RadixPopover.Close
            className="rounded-md h-[25px] w-[25px] p-0 inline-flex items-center justify-center text-violet11 absolute top-[5px] right-[5px] hover:bg-violet4 focus:shadow-[0_0_0_2px] focus:shadow-violet7 outline-none cursor-default"
            aria-label="Close"
          >
            <Cross2Icon />
          </RadixPopover.Close>
          <RadixPopover.Arrow className="fill-neutral-700" />
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
};

export default Popover;
