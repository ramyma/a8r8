import React, { useContext, useRef } from "react";
import { KonvaEventObject } from "konva/lib/Node";
import { Group, Rect } from "react-konva";
import { Rect as RectType } from "konva/lib/shapes/Rect";
import ThemeContext from "../context/ThemeContext";

interface Props {
  isGenerating: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  stageScale: number;
  isTransforming: boolean;
}

export const AnchorPoints = ({
  isGenerating,
  x,
  width,
  y,
  height,
  stageScale,
  isTransforming,
}: Props) => {
  const theme = useContext(ThemeContext);

  const handleMouseEnterSideAnchor = (e: KonvaEventObject<MouseEvent>) => {
    const stageContainer = e.target.getStage()?.container();
    stageContainer && (stageContainer.style.cursor = "ew-resize");
  };
  const handleMouseEnterVerticalAnchor = (e: KonvaEventObject<MouseEvent>) => {
    const stageContainer = e.target.getStage()?.container();
    stageContainer && (stageContainer.style.cursor = "ns-resize");
  };
  const handleMouseEnterRightDiagonalAnchor = (
    e: KonvaEventObject<MouseEvent>
  ) => {
    const stageContainer = e.target.getStage()?.container();
    stageContainer && (stageContainer.style.cursor = "nesw-resize");
  };
  const handleMouseEnterLeftDiagonalAnchor = (
    e: KonvaEventObject<MouseEvent>
  ) => {
    const stageContainer = e.target.getStage()?.container();
    stageContainer && (stageContainer.style.cursor = "nwse-resize");
  };

  const handleMouseLeaveAnchor = (e: KonvaEventObject<MouseEvent>) => {
    if (!isTransforming) {
      const stageContainer = e.target.getStage()?.container();
      stageContainer && (stageContainer.style.cursor = "auto");
    }
  };
  const anchor = useRef<RectType>(null);
  const anchorSize = Math.max(4, 16 / stageScale);
  const anchorHalfSize = anchorSize / 2;

  const fill = theme.colors.primary;

  return (
    <Group visible={!isGenerating}>
      <Rect
        id="bottomRightAnchor"
        x={x + +(width ?? 0) - anchorHalfSize + 2}
        y={y + +(height ?? 0) - anchorHalfSize + 2}
        width={anchorSize}
        height={anchorSize}
        fill={fill}
        onMouseEnter={handleMouseEnterLeftDiagonalAnchor}
        onMouseLeave={handleMouseLeaveAnchor}
      />
      <Rect
        id="topRightAnchor"
        x={x + +(width ?? 0) - anchorHalfSize + 2}
        y={y - anchorHalfSize - 2}
        width={anchorSize}
        height={anchorSize}
        fill={fill}
        onMouseEnter={handleMouseEnterRightDiagonalAnchor}
        onMouseLeave={handleMouseLeaveAnchor}
      />
      <Rect
        id="bottomLeftAnchor"
        x={x - anchorHalfSize - 2}
        y={y + +(height ?? 0) - anchorHalfSize + 2}
        width={anchorSize}
        height={anchorSize}
        fill={fill}
        onMouseEnter={handleMouseEnterRightDiagonalAnchor}
        onMouseLeave={handleMouseLeaveAnchor}
      />
      <Rect
        id="topLeftAnchor"
        x={x - anchorHalfSize - 2}
        y={y - anchorHalfSize - 2}
        width={anchorSize}
        height={anchorSize}
        fill={fill}
        onMouseEnter={handleMouseEnterLeftDiagonalAnchor}
        onMouseLeave={handleMouseLeaveAnchor}
      />

      <Rect
        id="leftAnchor"
        ref={anchor}
        x={x - anchorHalfSize - 2}
        y={y + +(height ?? 0) / 2 - anchorHalfSize + 2}
        width={anchorSize}
        height={anchorSize}
        fill={fill}
        onMouseEnter={handleMouseEnterSideAnchor}
        onMouseLeave={handleMouseLeaveAnchor}
      />
      <Rect
        id="topAnchor"
        x={x + +(width ?? 0) / 2 - anchorHalfSize + 2}
        y={y - anchorHalfSize - 2}
        width={anchorSize}
        height={anchorSize}
        fill={fill}
        onMouseEnter={handleMouseEnterVerticalAnchor}
        onMouseLeave={handleMouseLeaveAnchor}
      />
      <Rect
        id="rightAnchor"
        x={x + +(width ?? 0) - anchorHalfSize + 2}
        y={y + +(height ?? 0) / 2 - anchorHalfSize + 2}
        width={anchorSize}
        height={anchorSize}
        fill={fill}
        onMouseEnter={handleMouseEnterSideAnchor}
        onMouseLeave={handleMouseLeaveAnchor}
      />
      <Rect
        id="bottomAnchor"
        x={x + +(width ?? 0) / 2 - anchorHalfSize + 2}
        y={y + +(height ?? 0) - anchorHalfSize + 2}
        width={anchorSize}
        height={anchorSize}
        fill={fill}
        onMouseEnter={handleMouseEnterVerticalAnchor}
        onMouseLeave={handleMouseLeaveAnchor}
      />
    </Group>
  );
};
