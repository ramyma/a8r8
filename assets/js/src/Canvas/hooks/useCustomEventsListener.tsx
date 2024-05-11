import { emitCustomEvent, useCustomEventListener } from "react-custom-events";
import { ActiveLayer } from "../../state/layersSlice";
import { PngInfo } from "../../utils";
import { Vector2d } from "konva/lib/types";

type Props = {
  clearLines?: (layer: ActiveLayer) => void;
  clearImages?: () => void;
};

const useCustomEventsListener = ({ clearLines }: Props) => {
  useCustomEventListener("customClearLayerLines", (layer: ActiveLayer) => {
    clearLines && clearLines(layer);
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
export const emitClearBaseImages = () => {
  emitCustomEvent("customClearBaseImages");
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

export default useCustomEventsListener;
