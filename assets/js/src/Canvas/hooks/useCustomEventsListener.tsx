import { emitCustomEvent, useCustomEventListener } from "react-custom-events";
import { ActiveLayer } from "../../state/layersSlice";
import { PngInfo } from "../../utils";

type Props = {
  clearLines?: (layer: ActiveLayer) => void;
  fillActiveLayer?: () => void;
  clearImages?: () => void;
  updateZoom: (zoom: number) => void;
};

const useCustomEventsListener = ({
  clearLines,
  fillActiveLayer,
  updateZoom,
}: Props) => {
  useCustomEventListener("customClearLayerLines", (layer: ActiveLayer) => {
    if (clearLines) {
      clearLines(layer);
    }
  });
  useCustomEventListener("customFillActiveLayer", () => {
    if (fillActiveLayer) {
      fillActiveLayer();
    }
  });
  useCustomEventListener("updateZoom", (value: number) => {
    updateZoom?.(value);
  });
};

export const emitClearLayerLines = (layer: ActiveLayer) => {
  emitCustomEvent("customClearLayerLines", layer);
};
export const emitImagePasteEvent = ({
  imageDataUrl,
  pngInfo,
}: {
  imageDataUrl: string;
  pngInfo?: PngInfo;
}) => {
  emitCustomEvent("custom-paste", {
    imageDataUrl,
    pngInfo,
  });
};
export const emitImageDropEvent = ({
  imageDataUrl,
  pngInfo,
}: {
  imageDataUrl: string;
  pngInfo?: PngInfo;
}) => {
  emitCustomEvent("custom-dnd", {
    imageDataUrl,
    pngInfo,
  });
};

export const emitUpdateSeed = (seed: number) => {
  emitCustomEvent("updateSeed", seed);
};

export const emitBatchGenerationProps = (batchGenerationProps: {
  image: HTMLImageElement;
  x: number;
  y: number;
  width?: number;
  height?: number;
}) => {
  emitCustomEvent("batchGenerationProps", batchGenerationProps);
};

export const emitUpdateZoomLevel = (zoomPercentage: number) => {
  emitCustomEvent("updateZoom", zoomPercentage);
};

export default useCustomEventsListener;
