import React, {
  LegacyRef,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Layer, Line, Rect } from "react-konva";
import Konva from "konva";
import RefsContext from "./context/RefsContext";
import { useAppSelector } from "./hooks";
import { BrushStroke } from "./MaskLayer-types";
import { selectMaskColor, selectStagePosition } from "./state/canvasSlice";
import pattern from "./pattern";
import { hexToRgb } from "./utils";
import { selectIsMaskLayerVisible } from "./state/layersSlice";
import { CanvasDimensions } from "./Canvas/Canvas.d";
import { Rect as RectType } from "konva/lib/shapes/Rect";

interface MaskLayerProps {
  dimensions: CanvasDimensions;
  lines: BrushStroke[];
}

const MaskLayer = ({ dimensions, lines }: MaskLayerProps) => {
  const maskColor = useAppSelector(selectMaskColor);
  // const stageScale = useAppSelector(selectStageScale);
  useAppSelector(selectStagePosition);
  const isMaskLayerVisible = useAppSelector(selectIsMaskLayerVisible);
  const { stageRef, maskCompositeRectRef } = useContext(RefsContext);
  const { maskLayerRef } = useContext(RefsContext);
  const [svgImage, setSvgImage] = useState<HTMLImageElement>();
  const prevMaskColor = useRef(maskColor);
  // const lines = useAppSelector(selectMaskLines);
  useEffect(() => {
    if (svgImage && prevMaskColor.current === maskColor) return;
    prevMaskColor.current = maskColor;
    const image = new window.Image();
    image.onload = () => {
      setSvgImage(image);
    };
    image.src = pattern(hexToRgb(maskColor));
  }, [maskColor, svgImage]);

  const stageScale = stageRef?.current?.scale()?.x ?? 1;
  const stagePosition = stageRef?.current?.getAbsolutePosition() ?? {
    x: 0,
    y: 0,
  };

  return (
    <Layer
      imageSmoothingEnabled={false}
      ref={maskLayerRef}
      filters={[Konva.Filters.RGB]}
      opacity={1}
      visible={isMaskLayerVisible}
    >
      {lines.map((line, i) => (
        <Line
          key={i}
          points={line.points}
          stroke={maskColor || "#df4b26"}
          strokeWidth={line.brushSize}
          tension={0.5}
          lineCap="round"
          lineJoin="round"
          globalCompositeOperation={
            line.tool === "eraser" ? "destination-out" : "source-over"
          }
        />
      ))}

      <Rect
        // ref={rectRef}
        // fill={brushColor}
        fillPatternImage={svgImage}
        fillPatternRepeat="repeat"
        fillPatternScale={{
          x: 1 / stageScale,
          y: 1 / stageScale,
        }}
        opacity={1}
        offsetX={stagePosition.x / stageScale}
        offsetY={stagePosition.y / stageScale}
        height={dimensions.height / stageScale + 100}
        width={dimensions.width / stageScale + 100}
        // fillPatternImage={fillPatternImage}
        // fillPatternOffsetY={!isNumber(offset) ? 0 : offset}
        // fillPatternRepeat={"repeat"}
        // fillPatternScale={{ x: 1 / stageScale, y: 1 / stageScale }}
        // listening={true}
        globalCompositeOperation={"source-in"}
        ref={maskCompositeRectRef as LegacyRef<RectType>}
      />
    </Layer>
  );
};

export default MaskLayer;
