import React, {
  forwardRef,
  LegacyRef,
  Ref,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Circle, Layer } from "react-konva";
import { BrushPreviewNode } from "./OverlayLayer-types";
import { useAppSelector } from "./hooks";
import {
  selectBrushColor,
  selectBrushSize,
  selectIsBrushPreviewVisible,
  selectMaskColor,
  selectMode,
  selectStageScale,
  selectTool,
} from "./state/canvasSlice";
import pattern from "./pattern";
import RefsContext from "./context/RefsContext";
import { hexToRgb } from "./utils";
import { selectActiveLayer } from "./state/layersSlice";

interface OverlayLayerProps {
  brushPreviewRef: Ref<BrushPreviewNode>;
}
const OverlayLayer = ({ brushPreviewRef }: OverlayLayerProps) => {
  const { overlayLayerRef } = useContext(RefsContext);
  return (
    <Layer
      imageSmoothingEnabled={false}
      ref={overlayLayerRef}
      listening={false}
    >
      <BrushPreview ref={brushPreviewRef} />
    </Layer>
  );
};

const BrushPreview = forwardRef((_props, ref: LegacyRef<BrushPreviewNode>) => {
  const brushSize = useAppSelector(selectBrushSize);
  const activeLayer = useAppSelector(selectActiveLayer);
  const mode = useAppSelector(selectMode);
  const tool = useAppSelector(selectTool);
  const isBrushPreviewVisible = useAppSelector(selectIsBrushPreviewVisible);
  useAppSelector(selectStageScale);

  const brushColor = useAppSelector(selectBrushColor);
  const [svgImage, setSvgImage] = useState<HTMLImageElement>();
  const { stageRef } = useContext(RefsContext);
  const maskColor = useAppSelector(selectMaskColor);
  const prevMaskColor = useRef(maskColor);
  useEffect(() => {
    if (svgImage && prevMaskColor.current === maskColor) return;
    prevMaskColor.current = maskColor;
    const image = new window.Image();

    image.onload = () => {
      setSvgImage(image);
    };
    image.src = pattern(hexToRgb(maskColor));
  }, [maskColor, svgImage]);
  // console.log(brushPreviewPosistion);
  const isVisible =
    isBrushPreviewVisible && mode !== "selection" && activeLayer !== "base";
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
        : activeLayer === "mask"
        ? {
            fillPatternImage: svgImage,
            fillPatternRepeat: "repeat",
            fillPatternScale: {
              x: 1 / (stageRef?.current?.scale()?.x ?? 1),
              y: 1 / (stageRef?.current?.scale()?.x ?? 1),
            },
          }
        : { fill: brushColor ?? "black" })}
    />
  );
});

BrushPreview.displayName = "BrushPreview";

export default OverlayLayer;
