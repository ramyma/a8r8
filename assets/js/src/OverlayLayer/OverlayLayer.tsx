import { Ref, useContext } from "react";
import { Layer } from "react-konva";

import { Circle as CircleType } from "konva/lib/shapes/Circle";
import { BrushPreview } from "./BrushPreview";
import { CanvasDimensions } from "../Canvas/Canvas.d";

import RefsContext from "../context/RefsContext";
import RegionMasksPreview from "./RegionMasksPreview";

export type BrushPreviewNode = CircleType;

interface OverlayLayerProps {
  dimensions: CanvasDimensions;
  brushPreviewRef: Ref<BrushPreviewNode>;
}
const OverlayLayer = ({ dimensions, brushPreviewRef }: OverlayLayerProps) => {
  const { overlayLayerRef } = useContext(RefsContext);

  return (
    <Layer
      dimensions={dimensions}
      imageSmoothingEnabled={false}
      ref={overlayLayerRef}
      listening={false}
    >
      <RegionMasksPreview dimensions={dimensions} />
      <BrushPreview ref={brushPreviewRef} />
    </Layer>
  );
};

export default OverlayLayer;
