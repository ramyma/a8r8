import {
  animated,
  useChain,
  useSpring,
  useSpringRef,
  useTransition,
} from "@react-spring/web";
import { useAppDispatch, useAppSelector } from "./hooks";
import {
  selectActiveBatchImageResultIndex,
  selectBatchImageResults,
  selectBatchPreviewIsVisible,
  setActiveBatchImageResultIndex,
  setBatchImageResults,
  setBatchPreviewIsVisible,
} from "./state/canvasSlice";
import Button from "./components/Button";
import { useEffect, useState } from "react";
import { emitCustomEvent } from "react-custom-events";
import {
  CheckIcon,
  Cross1Icon,
  EyeNoneIcon,
  EyeOpenIcon,
} from "@radix-ui/react-icons";
import Toggle from "./components/Toggle";

type Props = {};

const BatchImageResults = (props: Props) => {
  const dispatch = useAppDispatch();
  const batchImageResults = useAppSelector(selectBatchImageResults);
  const batchPreviewIsVisible = useAppSelector(selectBatchPreviewIsVisible);
  const activeBatchImageResultIndex = useAppSelector(
    selectActiveBatchImageResultIndex
  );
  const isVisible = batchImageResults.length > 1;
  const [batchImagesState, setBatchImagesState] = useState(batchImageResults);

  const transitionRef = useSpringRef();
  const springRef = useSpringRef();

  const transitions = useTransition(batchImagesState, {
    initial: {
      y: 100,
      opacity: 0,
    },
    enter: {
      y: 0,
      opacity: 1,
    },
    leave: {
      y: -100,
      opacity: 0,
    },
    update: {},
    trail: 1,
    ref: transitionRef,
    keys: (item) => item,
  });

  useEffect(() => {
    if (isVisible) setBatchImagesState(batchImageResults);
  }, [batchImageResults, isVisible]);

  const style = useSpring({
    y: batchImageResults?.length ? 0 : 300,
    onRest: () => {
      if (!batchImageResults.length) setBatchImagesState([]);
    },
    ref: springRef,
  });

  useChain(isVisible ? [springRef] : [springRef, transitionRef]);

  const toggleVisibility = () => {
    dispatch(setBatchPreviewIsVisible(!batchPreviewIsVisible));
  };

  return (
    <div className="absolute bottom-0 flex justify-center w-full p-2 z-50 pointer-events-none">
      {/* TODO: migrate to motion */}
      <animated.div
        style={style}
        className="flex gap-2 pointer-events-auto bg-neutral-950/80 p-4 pe-3 rounded-xs backdrop-blur-xs"
      >
        {transitions((style, imageResult, _, index) => (
          <animated.div
            key={index}
            style={style}
            className={`size-40 rounded-xs border border-neutral-700 cursor-pointer ${activeBatchImageResultIndex === index ? "outline outline-neutral-200" : ""}`}
          >
            <img
              draggable={false}
              src={imageResult}
              className="w-full h-full object-contain bg-black/80 backdrop-blur-xs rounded-xs"
              onClick={() => {
                if (activeBatchImageResultIndex !== index) {
                  dispatch(setActiveBatchImageResultIndex(index));
                  emitCustomEvent("batchPreviewImageSelection", imageResult);
                }
              }}
            />
          </animated.div>
        ))}
        <div className="flex justify-between items-center flex-col">
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => {
                emitCustomEvent("applyActiveBatchImage");
              }}
              className="text-success border-success hover:text-success hover:border-success!"
              title="Accept"
              {...(!isVisible && { tabIndex: -1 })}
            >
              <CheckIcon />
            </Button>
            <Button
              onClick={() => dispatch(setBatchImageResults())}
              className="text-danger border-danger hover:text-danger hover:border-danger!"
              title="Cancel"
              {...(!isVisible && { tabIndex: -1 })}
            >
              <Cross1Icon />
            </Button>
          </div>
          <Toggle
            pressed={batchPreviewIsVisible}
            onChange={toggleVisibility}
            title="Show/Hide"
            pressedIconComponent={EyeOpenIcon}
            unpressedIconComponent={EyeNoneIcon}
            className="border border-neutral-700 bg-neutral-900/50 backdrop-blur-xs"
            {...(!isVisible && { tabIndex: -1 })}
          />
        </div>
      </animated.div>
    </div>
  );
};

export default BatchImageResults;
