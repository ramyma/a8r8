import {
  forwardRef,
  LegacyRef,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Circle } from "react-konva";
import { useAppSelector } from "../hooks";
import {
  selectBrushSize,
  selectBrushHardness,
  selectIsBrushPreviewVisible,
  selectMode,
  selectStageScale,
  selectTool,
} from "../state/canvasSlice";
import pattern from "../pattern";
import RefsContext from "../context/RefsContext";
import { hexToRgb, isSketchLayer } from "../utils";
import { selectActiveLayer } from "../state/layersSlice";
import useBrushColor from "../hooks/useBrushColor";
import { BrushPreviewNode } from "./OverlayLayer";
import { hexToRgba } from "../utils";

export const BrushPreview = forwardRef(
  (_props, ref: LegacyRef<BrushPreviewNode>) => {
    const brushSize = useAppSelector(selectBrushSize);
    const activeLayer = useAppSelector(selectActiveLayer);
    const mode = useAppSelector(selectMode);
    const tool = useAppSelector(selectTool);
    const isBrushPreviewVisible = useAppSelector(selectIsBrushPreviewVisible);
    useAppSelector(selectStageScale);

    const [svgImage, setSvgImage] = useState<HTMLImageElement>();
    const { stageRef } = useContext(RefsContext);
    const brushColor = useBrushColor();
    const brushHardness = useAppSelector(selectBrushHardness);

    const prevMaskColor = useRef(brushColor);

    useEffect(() => {
      if (svgImage && prevMaskColor.current === brushColor) return;
      prevMaskColor.current = brushColor;
      const image = new window.Image();

      image.onload = () => {
        setSvgImage(image);
      };
      image.src = pattern(hexToRgb(brushColor));
    }, [brushColor, svgImage]);

    const isVisible =
      isBrushPreviewVisible &&
      tool &&
      mode === "paint" &&
      activeLayer !== "base";

    return (
      <Circle
        radius={brushSize / 2}
        listening={false}
        visible={isVisible}
        // x={brushPreviewPosistion.x}
        // y={brushPreviewPosistion.y}
        ref={ref}
        {...(tool === "eraser"
          ? { fill: "red", opacity: 0.1 }
          : (activeLayer as string)?.includes("mask")
            ? {
                fillPatternImage: svgImage,
                fillPatternRepeat: "repeat",
                fillPatternScale: {
                  x: 1 / (stageRef?.current?.scale()?.x ?? 1),
                  y: 1 / (stageRef?.current?.scale()?.x ?? 1),
                },
              }
            : isSketchLayer(activeLayer)
              ? {
                  fillRadialGradientStartRadius: 0,
                  fillRadialGradientEndRadius: brushSize / 2,
                  fillRadialGradientColorStops: [
                    0,
                    hexToRgba(brushColor),
                    brushHardness,
                    hexToRgba(brushColor),
                    1,
                    hexToRgba(brushColor, 0),
                  ],
                }
              : { fill: brushColor ?? "black" })}
      />
    );
  }
);
BrushPreview.displayName = "BrushPreview";
