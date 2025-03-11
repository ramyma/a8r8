import {
  HTMLProps,
  KeyboardEvent,
  MouseEvent,
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
        <Portal.Root className="absolute w-screen h-screen">
          <motion.div
            className="top-0 left-0 bg-black/50 backdrop-blur-sm absolute flex w-screen h-screen shadow-2xs shadow-black/90 align-middle justify-center items-center text-center z-40"
            onClick={handleOutsideClick}
            initial={{
              opacity: 0.6,
              y: 0 /*scale: 0.95*/,

              filter: "blur(10px)",
            }}
            animate={isOpen ? "open" : "closed"}
            variants={{
              open: {
                opacity: 1,
                y: 0,

                filter: "blur(0px)",
              },
              close: {
                opacity: 0,
                y: 0,
              },
            }}
            // animate={{ opacity: 1, y: 0, scale: 1 }}
            // transition={{ bounce: 0.1 }}
            exit={{
              opacity: 0,
              filter: "blur(10px)",
              transition: {
                // type: "tween",
                duration: 0.4,
                // delay: 0.1,
              },
            }}
            ref={outsideRef}
          >
            <motion.div
              initial={{
                rotateX: 5,
                rotateY: 10,
                // rotateZ: 1,
                transformPerspective: 2000,
                // y: 50,
                scale: 0.95,
              }}
              animate={{
                rotateY: 0,
                rotateX: 0,
                // rotateZ: 0,
                scale: 1,
                // y: 0,
              }}
              exit={{
                rotateX: 0,
                rotateY: 10,
                // rotateZ: 1,
                transformPerspective: 2000,
                // scale: 0.95,
                // transition: {
                //   visualDuration: 0.2,
                //   bounce: 0.16,
                //   // damping: 10,
                //   // stiffness: 200,
                //   type: "spring",
                // },
              }}
              transition={{
                visualDuration: 0.4,
                bounce: 0.16,
                // damping: 10,
                // stiffness: 200,
                type: "spring",
              }}
              className={twMerge(
                " w-[95vw] h-[90vh] bg-neutral-900/95 border border-neutral-700/30 rounded-sm shadow-2xs shadow-black/50 overflow-hidden",
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
                      "h-[90vh] bg-opacity-90 backdrop-blur-xs  align-middle justify-center items-center text-center p-8",
                      className
                    )}
                  >
                    {children}
                  </div>
                </div>
              </ScrollArea>
            </motion.div>
          </motion.div>
        </Portal.Root>
      )}
    </AnimatePresence>
  );
};

export default Modal;
