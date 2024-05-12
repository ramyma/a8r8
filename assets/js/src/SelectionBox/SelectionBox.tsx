import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Vector2d } from "konva/lib/types";
import { Group, Image, Rect, Text } from "react-konva";
import RefsContext from "../context/RefsContext";
import { useAppSelector } from "../hooks";
import { selectMode, selectStageScale } from "../state/canvasSlice";
import { selectStats } from "../state/statsSlice";
import { AnchorPoints } from "./AnchorPoints";
import useEvents from "./hooks/useEvents";
import ThemeContext from "../context/ThemeContext";
import useProgress from "../hooks/useProgress";
import { roundToClosestMultipleOf8 } from "../utils";

interface Props {
  remoteSession?: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  isGenerating: boolean;
  progress: number;
}

const SelectionBox = ({
  remoteSession = false,
  x,
  y,
  width,
  height,
  progress,
  isGenerating,
}: Props) => {
  const { selectionBoxRef } = useContext(RefsContext);

  const { isConnected } = useAppSelector(selectStats);

  const theme = useContext(ThemeContext);
  const mode = useAppSelector(selectMode);
  const stageScale = useAppSelector(selectStageScale);

  const { isTransforming } = useEvents();
  const [previewImg, setPreviewImg] = useState<HTMLImageElement | undefined>();

  const prevIsGenerating = useRef(isGenerating);

  useEffect(() => {
    if (isGenerating !== prevIsGenerating.current) {
      setPreviewImg(undefined);
      prevIsGenerating.current = isGenerating;
    }
  }, [isGenerating]);

  const handleProgress = ({ currentImage }) => {
    if (currentImage) {
      const img = new window.Image();
      img.onload = function () {
        setPreviewImg(img);
      };
      img.src = currentImage;
    }
  };

  useProgress({ handleProgress });
  const isSelectionMode = mode === "selection";

  const textPosition: Vector2d = {
    x: x + 24,
    y: y + 24,
  };

  const progressStrokeColor = theme?.colors?.success ?? "#15803d";
  const strokeColor = theme
    ? remoteSession
      ? theme?.colors?.neutral["700"]
      : theme?.colors?.yellow["800"]
    : "#8787877d";
  const stop = Math.min(1, progress / 100);

  const strokeGradient = [
    stop,
    progress ? progressStrokeColor : strokeColor,
    stop,
    progress < 100 ? strokeColor : progressStrokeColor,
    1,
    progress < 100 ? strokeColor : progressStrokeColor,
  ];

  const selectionOutlineStrokeWidth = 4;

  const rectX = x - selectionOutlineStrokeWidth / 2;
  const rectY = y - selectionOutlineStrokeWidth / 2;

  //FIXME: batch image preview
  const previewImgWidth = useMemo(
    () =>
      previewImg
        ? width < height
          ? width
          : Math.min(
              width,
              roundToClosestMultipleOf8(
                (height * previewImg?.width) / previewImg?.height
              )
            )
        : width,
    [height, previewImg, width]
  );

  //FIXME: batch image preview
  const previewImgHeight = useMemo(
    () =>
      previewImg
        ? height < width
          ? height
          : Math.min(
              height,
              roundToClosestMultipleOf8(
                (width * previewImg?.height) / previewImg?.width
              )
            )
        : height,
    [height, previewImg, width]
  );
  const previewImgX = width > height ? x - (previewImgWidth - width) / 2 : x;
  const previewImgY = height > width ? y - (previewImgHeight - height) / 2 : y;

  return (
    <>
      <Group
        listening={!remoteSession}
        visible={!isNaN(rectX) && !isNaN(rectY)}
      >
        {/* FIXME: framing has empty pixels in the result image */}
        <Rect
          x={rectX}
          y={rectY}
          width={+(width + selectionOutlineStrokeWidth ?? 0)}
          height={+(height + selectionOutlineStrokeWidth ?? 0)}
          strokeLinearGradientColorStops={strokeGradient}
          strokeLinearGradientStartPoint={{
            x: 0 - 2,
            y: 0,
          }}
          strokeLinearGradientEndPoint={{
            x: width + 6,
            y: 0,
          }}
          strokeWidth={selectionOutlineStrokeWidth}
          perfectDrawEnabled
          preventDefault
          listening={false}
        />
        <Rect
          id="selectionBox"
          x={x}
          y={y}
          width={+(width ?? 0)}
          height={+(height ?? 0)}
          strokeEnabled={false}
          strokeWidth={2}
          ref={!remoteSession ? selectionBoxRef : null}
          listening={isSelectionMode && !isGenerating}
          perfectDrawEnabled
          preventDefault
        />
        {!remoteSession && mode === "selection" && (
          <AnchorPoints
            isGenerating={isGenerating}
            x={x}
            width={width}
            y={y}
            height={height}
            stageScale={stageScale}
            isTransforming={isTransforming}
          />
        )}
      </Group>
      {!remoteSession && (
        <Text
          text={`${width} x ${height}`}
          x={textPosition.x}
          y={textPosition.y}
          fill="white"
          fontSize={Math.min(76, 48 / stageScale)}
          visible={isTransforming}
        />
      )}
      {isConnected && isGenerating && !!previewImg && (
        <>
          <Rect
            x={x}
            y={y}
            width={width}
            height={height}
            fill="black"
            opacity={0.9}
            // filters={}
          />
          <Image
            //TODO: link position to generation position and dimensions
            x={previewImgX}
            y={previewImgY}
            width={previewImgWidth}
            height={previewImgHeight}
            visible={isGenerating}
            image={previewImg}
          />

          <ProgressRect
            progress={progress}
            selectionBox={{ x, y, width, height }}
          />
        </>
      )}
    </>
  );
};
SelectionBox.displayName = "SelectionBox";

const ProgressRect = ({
  progress,
  selectionBox,
}: {
  progress: number;
  selectionBox: { x: number; y: number; width: number; height: number };
}) => {
  const width = (((selectionBox.width ?? 0) + 8) * progress) / 100.0;
  const x = (selectionBox.x ?? 0) - 4;
  const y = (selectionBox.height ?? 0) + (selectionBox.y ?? 0) + 3;
  const theme = useContext(ThemeContext);

  return (
    <Rect
      width={width}
      height={16}
      x={x}
      y={y}
      fill={(theme?.colors?.success as string) ?? "#15803d"}
      strokeEnabled={false}
      listening={false}
    />
  );
};

export default SelectionBox;
