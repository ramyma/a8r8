import { emitCustomEvent, useCustomEventListener } from "react-custom-events";
import { ActiveLayer } from "../../state/layersSlice";
import { PngInfo } from "../../utils";

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
export default useCustomEventsListener;
