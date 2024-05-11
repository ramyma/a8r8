import React, {
  LegacyRef,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Group, Layer, Line, Rect } from "react-konva";
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
import {
  selectIsRegionalPromptsEnabled,
  selectPromptRegionLayers,
} from "./state/promptRegionsSlice";
import useScripts from "./hooks/useScripts";

interface MaskLayerProps {
  dimensions: CanvasDimensions;
  lines: BrushStroke[];
  regionMaskLines: Record<string, BrushStroke[]>;
  tempRegionMaskLines: Record<string, BrushStroke[]>;
}

const MaskLayer = ({
  dimensions,
  lines,
  regionMaskLines,
  tempRegionMaskLines,
}: MaskLayerProps) => {
  const maskColor = useAppSelector(selectMaskColor);
  // const stageScale = useAppSelector(selectStageScale);
  useAppSelector(selectStagePosition);

  const { hasRegionalPrompting } = useScripts();

  const isMaskLayerVisible = useAppSelector(selectIsMaskLayerVisible);
  const isRegionalPromptsEnabled = useAppSelector(
    selectIsRegionalPromptsEnabled
  );

  const promptRegionLayers = useAppSelector(selectPromptRegionLayers);

  const { stageRef, maskCompositeRectRef, regionMasksGroupRef, maskGroupRef } =
    useContext(RefsContext);

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
      filters={[Konva.Filters.RGB]}
      opacity={1}
    >
      <Group visible={isMaskLayerVisible} ref={maskGroupRef}>
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
      </Group>

      {hasRegionalPrompting && isRegionalPromptsEnabled && (
        <>
          <Group ref={regionMasksGroupRef}>
            {promptRegionLayers.map(({ id, isVisible, maskColor }) => (
              <Group key={id} visible={isVisible}>
                {id &&
                  regionMaskLines?.[id]?.map((line, index) => (
                    <Line
                      key={id + index}
                      points={line.points}
                      stroke={maskColor || "#df4b26"}
                      strokeWidth={line.brushSize}
                      tension={0.5}
                      lineCap="round"
                      lineJoin="round"
                      globalCompositeOperation={
                        line.tool === "eraser"
                          ? "destination-out"
                          : "source-over"
                      }
                    />
                  ))}
                {id &&
                  tempRegionMaskLines?.[id]?.map((line, index) => (
                    <Line
                      key={id + index}
                      points={line.points}
                      stroke={maskColor || "#df4b26"}
                      strokeWidth={line.brushSize}
                      tension={0.5}
                      lineCap="round"
                      lineJoin="round"
                      globalCompositeOperation={
                        line.tool === "eraser"
                          ? "destination-out"
                          : "source-over"
                      }
                    />
                  ))}
              </Group>
            ))}
            <Rect
              opacity={0.7}
              offsetX={stagePosition.x / stageScale}
              offsetY={stagePosition.y / stageScale}
              height={dimensions.height / stageScale + 100}
              width={dimensions.width / stageScale + 100}
              fill="white"
              globalCompositeOperation={"destination-in"}
            />
          </Group>
        </>
      )}
    </Layer>
  );
};

export default MaskLayer;
