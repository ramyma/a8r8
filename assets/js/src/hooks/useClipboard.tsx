import { useCallback, useContext, useEffect } from "react";
import usePngInfo from "./usePngInfo";
import { useAppDispatch, useAppSelector } from "../hooks";
import { PngInfo, getLayers, updateControlnetArgs } from "../utils";
import RefsContext from "../context/RefsContext";
import {
  selectActiveLayer,
  selectIsMaskLayerVisible,
} from "../state/layersSlice";
import { selectControlnetLayers } from "../state/controlnetSlice";
import { useCustomEventListener } from "react-custom-events";
import { emitImagePasteEvent } from "../Canvas/hooks/useCustomEventsListener";

interface Props {
  handleAddImage?: (any) => void;
  emit?: boolean;
}

const useClipboard = ({ handleAddImage, emit = false }: Props) => {
  const { processPngInfo } = usePngInfo();
  const dispatch = useAppDispatch();
  const refs = useContext(RefsContext);
  const activeLayer = useAppSelector(selectActiveLayer);

  useCustomEventListener("custom-paste", (data) => {
    handleAddImage && handleAddImage(data);
  });

  const handlePasteEvent = useCallback(
    async function (event: ClipboardEvent, override = false): Promise<void> {
      const target: HTMLElement = event.target as HTMLElement;

      const readerOnload = async function (event) {
        if (event.target) {
          const dataUrl = event.target.result;
          if (typeof dataUrl === "string") {
            let pngInfo: PngInfo | undefined;
            if (activeLayer === "base") {
              pngInfo = await processPngInfo(dataUrl);
              pngInfo && updateControlnetArgs(pngInfo, dispatch);
            }

            emitImagePasteEvent({
              imageDataUrl: dataUrl,
              pngInfo,
            });
          }
        }
      };
      if (override) {
        const clipboardContents = await navigator.clipboard.read();

        for (const item of clipboardContents) {
          console.log(item.types);
          if (!item.types.includes("image/png")) {
            return;
          }
          const blob = await item.getType("image/png");
          const reader = new FileReader();

          reader.onload = readerOnload;

          if (blob) {
            reader.readAsDataURL(blob);
          }
        }
      } else if (target.nodeName === "BODY") {
        //FIXME: target not body when any element is in focus
        const items: DataTransferItemList | undefined =
          event.clipboardData?.items;

        if (items) {
          for (const index in items) {
            const item: DataTransferItem = items[index];
            if (item.kind === "file") {
              const blob = item.getAsFile();

              const reader = new FileReader();

              reader.onload = readerOnload;

              if (blob) {
                reader.readAsDataURL(blob);
              }
            }
          }
        }
      }
    },
    [activeLayer, dispatch, processPngInfo]
  );
  const isMaskLayerVisible = useAppSelector(selectIsMaskLayerVisible);
  const controlnetLayersArgs = useAppSelector(selectControlnetLayers);

  const handleCopyEvent = useCallback(
    async (event, override = false) => {
      if (override || event.target.nodeName === "BODY") {
        if (navigator?.clipboard?.write) {
          const { initImageDataUrl } = await getLayers({
            refs,
            isMaskLayerVisible,
            controlnetLayersArgs,
          });
          if (initImageDataUrl) {
            try {
              const response = await fetch(initImageDataUrl);
              const blob = await response.blob();
              const item = new ClipboardItem({ "image/png": blob });
              await navigator.clipboard.write([item]);
              console.log("Image copied to clipboard");
            } catch (error) {
              console.error("Failed to copy image: ", error);
            }
          }
        } else {
          return Promise.reject("The Clipboard API is not available.");
        }
      }
    },
    [controlnetLayersArgs, isMaskLayerVisible, refs]
  );

  useEffect(() => {
    if (emit) {
      document.addEventListener("paste", handlePasteEvent);
      return () => {
        document.removeEventListener("paste", handlePasteEvent);
      };
    }
  }, [handlePasteEvent, emit]);

  useEffect(() => {
    if (emit) {
      document.addEventListener("copy", handleCopyEvent);
      return () => {
        document.removeEventListener("copy", handleCopyEvent);
      };
    }
  }, [handleCopyEvent, emit]);

  return { handleCopyEvent, handlePasteEvent };
};

export default useClipboard;
