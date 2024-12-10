import {
  HTMLProps,
  MouseEventHandler,
  PropsWithChildren,
  RefObject,
  useRef,
} from "react";
import * as Portal from "@radix-ui/react-portal";
import ScrollArea from "./ScrollArea";
import { twMerge } from "tailwind-merge";
import { AnimatePresence, motion } from "motion/react";

export type ModalProps = PropsWithChildren<
  {
    open: boolean;
    onClose: (event: MouseEvent | KeyboardEvent) => void;
    anchorElm?: RefObject<HTMLElement>;
    className?: string;
    containerClassName?: string;
    scrollAreaRef?: RefObject<HTMLDivElement>;
    disableScroll?: boolean;
    scroll?: boolean;
  } & HTMLProps<HTMLDivElement>
>;

const Modal = ({
  children,
  open: isOpen,
  onClose,
  anchorElm,
  className = "",
  containerClassName = "",
  scrollAreaRef,
  disableScroll,
  scroll = true,
}: ModalProps) => {
  const outsideRef = useRef<HTMLDivElement>(null);
  const modalContRef = useRef<HTMLDivElement>(null);

  // const anchorElmBox = anchorElm?.current?.getBoundingClientRect();

  const handleOutsideClick: MouseEventHandler = (event) => {
    if (event.target === outsideRef.current) onClose(event);
  };
  return (
    <AnimatePresence>
      {isOpen && (
        <Portal.Root
          onClick={handleOutsideClick}
          className={`absolute flex w-screen h-screen transition-all ${isOpen ? "bg-black/50 backdrop-blur-sm opacity-1" : "pointer-events-none opacity-0"} shadow shadow-black/90 align-middle justify-center items-center text-center z-40`}
          ref={outsideRef}
        >
          <motion.div
            initial={{ opacity: 0.6, y: 0 /*scale: 0.95*/ }}
            animate={isOpen ? "open" : "closed"}
            variants={{
              open: {
                opacity: 1,
                y: 0,
                scale: 1,
              },
            }}
            // animate={{ opacity: 1, y: 0, scale: 1 }}
            // transition={{ bounce: 0.1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={twMerge(
              " w-[95vw] h-[90vh]  bg-neutral-900/95 border border-neutral-700/30 rounded shadow shadow-black/50",
              containerClassName
            )}
            ref={modalContRef}
            // layout
          >
            <ScrollArea
              className="h-full"
              ref={scrollAreaRef}
              disable={disableScroll}
              scroll={scroll}
            >
              <div className="h-full">
                <div
                  className={twMerge(
                    "h-[90vh] bg-opacity-90 backdrop-blur-sm  align-middle justify-center items-center text-center p-8",
                    className
                  )}
                >
                  {children}
                </div>
              </div>
            </ScrollArea>
          </motion.div>
        </Portal.Root>
      )}
    </AnimatePresence>
  );
};

export default Modal;
