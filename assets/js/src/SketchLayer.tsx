import React, { useContext } from "react";
import { Layer, Line } from "react-konva";
import { CanvasDimensions } from "./Canvas/Canvas";
import RefsContext from "./context/RefsContext";
import { useAppSelector } from "./hooks";
import { BrushStroke } from "./MaskLayer-types";
import { selectIsSketchLayerVisible } from "./state/layersSlice";

interface SketchLayerProps {
  lines: BrushStroke[];
  dimensions: CanvasDimensions;
}
const SketchLayer = ({ dimensions, lines }: SketchLayerProps) => {
  const { sketchLayerRef } = useContext(RefsContext);
  const isSketchModeVisible = useAppSelector(selectIsSketchLayerVisible);
  return (
    <Layer
      imageSmoothingEnabled={false}
      ref={sketchLayerRef}
      id="SketchLayer"
      visible={isSketchModeVisible}
      listening={false}
    >
      {lines.map((line, i) => (
        <Line
          key={i}
          points={line.points}
          stroke={line.brushColor || "#df4b26"}
          strokeWidth={line.brushSize}
          tension={0.5}
          lineCap="round"
          lineJoin="round"
          globalCompositeOperation={
            line.tool === "eraser" ? "destination-out" : "source-over"
          }
        />
      ))}
    </Layer>
  );
};

SketchLayer.displayName = "SketchLayer";

export default SketchLayer;
