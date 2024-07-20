import React, {
  HTMLProps,
  KeyboardEventHandler,
  MouseEventHandler,
  PropsWithChildren,
  PropsWithoutRef,
  RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as Portal from "@radix-ui/react-portal";
import ScrollArea from "./ScrollArea";
import {
  SpringRef,
  animated,
  config,
  useChain,
  useSpring,
  useSpringRef,
  useTransition,
} from "@react-spring/web";
import { v4 } from "uuid";
import { twMerge } from "tailwind-merge";

export type ModalProps = PropsWithChildren<
  {
    isOpen: boolean;
    onClose: (event: MouseEvent | KeyboardEvent) => void;
    anchorElm?: RefObject<HTMLElement>;
    className?: string;
    childSpringRef?: SpringRef;
    scrollAreaRef?: RefObject<HTMLDivElement>;
  } & HTMLProps<HTMLDivElement>
>;

const Modal = ({
  children,
  isOpen,
  onClose,
  anchorElm,
  className = "",
  childSpringRef,
  scrollAreaRef,
}: ModalProps) => {
  const outsideRef = useRef<HTMLDivElement>(null);
  const modalContRef = useRef<HTMLDivElement>(null);

  // const springRef = useSpringRef();

  // const [offset, setOffset] = useState<{ x: number; y: number }>({
  //   x: 0,
  //   y: 0,
  // });
  const anchorElmBox = anchorElm?.current?.getBoundingClientRect();
  // const [isPending, startTransition] = React.useTransition();
  // const [prevIsOpen, setPrevIsOpen] = useState<boolean>();

  // const style = useSpring({
  //   from: { scale: 0.7, x: offset.x + "px", y: offset.y + "px", opacity: 0.5 },
  //   to: { scale: 1, x: "0px", y: "0px", opacity: 1 },
  //   config: { ...config.stiff, friction: 25 },
  // });

  // const getOffset = useCallback(() => {
  //   const modalContBox = modalContRef.current?.getBoundingClientRect();
  //   const xOffset = (anchorElmBox?.right ?? 0) - (modalContBox?.left ?? 0);
  //   const yOffset = (anchorElmBox?.top ?? 0) - (modalContBox?.top ?? 0);
  //   console.log({ xOffset, yOffset });
  //   return { xOffset, yOffset };
  // }, []);

  const transitions = useTransition(isOpen ? [1] : [], {
    // initial: () => {
    //   // const { xOffset, yOffset } = getOffset();
    //   return {
    //     scale: 0.8,
    //     /*x: xOffset + "px", y: yOffset + "px",*/ opacity: 0,
    //   };
    // },
    from: () => {
      // const { xOffset, yOffset } = getOffset();

      return {
        // scale: 0.95,
        // x: xOffset + "px",
        // y: yOffset + "px",
        y: 40,
        opacity: 0,
      };
    },
    enter: { scale: 1, y: 0, /* x: "0px", y: "0px",*/ opacity: 1 }, // x: 0, y: 0 },
    // update: () => {
    //   // const { xOffset, yOffset } = getOffset();

    //   return {
    //     // /*scale: 1,*/ x: isOpen ? "0px" : xOffset + "px",
    //     // y: isOpen ? "0px" : yOffset + "px",
    //     opacity: isOpen ? 1 : 1,
    //   };
    // }, // x: 0, y: 0 },
    leave: () => {
      // const { xOffset, yOffset } = getOffset();

      return {
        scale: 0.95,
        opacity: 0 /*x: -offset.x + "px", y: -offset.y + "px"*/,
        y: 40,
        // x: xOffset + "px",
        // y: yOffset + "px",
      };
    },

    // to: {
    //   opacity: isOpen ? 1 : 0,
    //   x: isOpen ? offset.x + "px" : "0px",
    //   y: isOpen ? offset.y + "px" : "0px",
    // },
    // config: config.gentle,
    keys: (i) => i,
    // ref: springRef,
  });

  // useChain(
  //   isOpen ? [springRef, childSpringRef] : [springRef],
  //   [0, isOpen ? 0.1 : 0.4]
  //   //   , [
  //   //   0,
  //   //   isOpen ? 0.1 : 0.6,
  //   // ]
  // );

  // useLayoutEffect(() => {
  //   if (isOpen && anchorElm) {
  //     console.log("INIT");
  //     const modalContBox = modalContRef.current?.getBoundingClientRect();
  //     console.log({ modalContBox, anchorElmBox });
  //     const xOffset = (anchorElmBox?.right ?? 0) - (modalContBox?.left ?? 0);
  //     const yOffset = (anchorElmBox?.top ?? 0) - (modalContBox?.top ?? 0);

  //     // startTransition(() => {
  //     //   console.log({ x: xOffset, y: yOffset }, "start");
  //     //   api.start();
  //     // });
  //     setOffset({ x: xOffset, y: yOffset });
  //   }
  // }, []);

  // if (isOpen !== prevIsOpen && modalContRef.current) {
  //   setPrevIsOpen(isOpen);
  //   !isOpen && api.start();
  // }

  const handleOutsideClick: MouseEventHandler = (event) => {
    if (event.target === outsideRef.current) onClose(event);
  };
  return (
    <Portal.Root
      onClick={handleOutsideClick}
      className={`absolute flex w-screen h-screen transition-all ${isOpen ? "bg-black/50 backdrop-blur-sm opacity-1" : "pointer-events-none opacity-0"} shadow shadow-black/90 align-middle justify-center items-center text-center z-40`}
      ref={outsideRef}
    >
      {transitions((style, _) => (
        // max-w-screen-lg
        <animated.div
          className=" w-[90vw] h-[90vh]  bg-neutral-900/95 border border-neutral-700/30 rounded shadow shadow-black/50"
          style={{
            ...style,
            // transformOrigin: `-${anchorElmBox?.right ?? 0}px ${anchorElmBox?.bottom ?? 0}px`,
          }}
          ref={modalContRef}
        >
          <ScrollArea type="auto" className="h-full" ref={scrollAreaRef}>
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
        </animated.div>
      ))}
    </Portal.Root>
  );
};

export default Modal;
