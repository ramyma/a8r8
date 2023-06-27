import React, { useContext, useState } from "react";
import { Layer, Line, Group } from "react-konva";
import RefsContext from "./context/RefsContext";

import { BrushStroke } from "./MaskLayer-types";
import { useDispatch, useSelector } from "react-redux";
import {
  ImageItem,
  selectControlnetLayers,
  updateControlnetLayer,
} from "./state/controlnetSlice";
import CanvasImage from "./components/CanvasImage";
import useHistoryState from "./hooks/useHistoryState";
import useClipboard from "./hooks/useClipboard";
import { useAppSelector } from "./hooks";
import { selectActiveLayer } from "./state/layersSlice";
import { selectSelectionBox } from "./state/selectionBoxSlice";
import useDragAndDrop from "./hooks/useDragAndDrop";

interface ControlnetLayerProps {
  lines: { [key: string]: BrushStroke[] };
  // lines: BrushStroke[];
}
const ControlnetLayer = ({ lines }: ControlnetLayerProps) => {
  const { controlnetLayerRef } = useContext(RefsContext);

  const controlnetLayers = useSelector(selectControlnetLayers);

  return (
    <Layer
      imageSmoothingEnabled={false}
      ref={controlnetLayerRef}
      id="controlnetLayer"
      listening={false}
    >
      {controlnetLayers
        // ?.slice(0)
        // .reverse()
        .map(
          ({
            id,
            image,
            imageDimensions,
            imagePosition,
            isEnabled,
            isVisible,
            detectionImage,
          }) => (
            <Group key={id} id={id} visible={isEnabled && isVisible}>
              {detectionImage && (
                <CanvasImage
                  src={detectionImage}
                  x={imagePosition?.x}
                  y={imagePosition?.y}
                  listening={false}
                  width={imageDimensions?.width}
                  height={imageDimensions?.height}
                />
              )}
              <ControlnetLayerImages layerId={id as string} image={image} />
              {lines[id as string]?.map((line, i) => (
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
            </Group>
          )
        )}
    </Layer>
  );
};

ControlnetLayer.displayName = "ControlnetLayer";

const ControlnetLayerImages = ({
  layerId,
  image,
}: {
  layerId: string;
  image?: ImageItem;
}) => {
  const dispatch = useDispatch();

  const activeLayer = useAppSelector(selectActiveLayer);

  const selectionBox = useAppSelector(selectSelectionBox);

  const handleAddImage = ({ imageDataUrl }) => {
    if (
      activeLayer.startsWith("controlnet") &&
      activeLayer.replace("controlnet", "") === layerId
    ) {
      const image: ImageItem = {
        src: imageDataUrl,
        x: selectionBox.x,
        y: selectionBox.y,
      };
      dispatch(updateControlnetLayer({ layerId, image }));
    }
  };

  useClipboard({ handleAddImage });
  useDragAndDrop({ handleAddImage });

  return image ? <CanvasImage src={image.src} x={image.x} y={image.y} /> : null;
};

export default ControlnetLayer;
