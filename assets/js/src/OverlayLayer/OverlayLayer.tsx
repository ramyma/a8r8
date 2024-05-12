import { Ref, useContext, useState } from "react";
import { Image, Layer } from "react-konva";

import { Circle as CircleType } from "konva/lib/shapes/Circle";
import { BrushPreview } from "./BrushPreview";
import { CanvasDimensions } from "../Canvas/Canvas.d";

import RefsContext from "../context/RefsContext";
import RegionMasksPreview from "./RegionMasksPreview";
import { useAppSelector } from "../hooks";
import {
  selectBatchImageResults,
  selectBatchPreviewIsVisible,
} from "../state/canvasSlice";
import { ImageConfig } from "konva/lib/shapes/Image";
import useBatchGenerationListeners, {
  UseBatchGenerationListenersProps,
} from "../hooks/useBatchGenerationListeners";

export type BrushPreviewNode = CircleType;

interface OverlayLayerProps {
  dimensions: CanvasDimensions;
  brushPreviewRef: Ref<BrushPreviewNode>;
}
const OverlayLayer = ({ dimensions, brushPreviewRef }: OverlayLayerProps) => {
  const { overlayLayerRef, batchResultPreviewImageRef } =
    useContext(RefsContext);

  const [batchPreviewProps, setBatchPreviewProps] = useState<ImageConfig>();

  const batchPreviewIsVisible = useAppSelector(selectBatchPreviewIsVisible);
  const batchImageResults = useAppSelector(selectBatchImageResults);

  const handleBatchGenerationProps: UseBatchGenerationListenersProps["handleBatchGenerationProps"] =
    (batchGenerationProps) => {
      setBatchPreviewProps(batchGenerationProps);
    };
  const handleBatchPreviewImageSelection: UseBatchGenerationListenersProps["handleBatchPreviewImageSelection"] =
    (image) => {
      if (image) {
        const img = new window.Image();
        img.src = image as string;
        setBatchPreviewProps((prev) => ({
          ...prev,
          image: img,
        }));
      }
    };
  useBatchGenerationListeners({
    handleBatchGenerationProps,
    handleBatchPreviewImageSelection,
  });

  return (
    <Layer
      dimensions={dimensions}
      imageSmoothingEnabled={false}
      ref={overlayLayerRef}
      listening={false}
    >
      {batchImageResults?.length > 0 &&
        batchPreviewProps &&
        batchPreviewIsVisible && (
          <Image {...batchPreviewProps} ref={batchResultPreviewImageRef} />
        )}
      <RegionMasksPreview dimensions={dimensions} />
      <BrushPreview ref={brushPreviewRef} />
    </Layer>
  );
};

export default OverlayLayer;
