import { useCallback, useEffect } from "react";
import usePngInfo from "./usePngInfo";
import { PngInfo, updateControlnetArgs } from "../utils";
import { useAppDispatch, useAppSelector } from "../hooks";
import { emitCustomEvent, useCustomEventListener } from "react-custom-events";
import { selectActiveLayer } from "../state/layersSlice";
import { emitImageDropEvent } from "../Canvas/hooks/useCustomEventsListener";

interface Props {
  handleAddImage?: (any) => void;
  emit?: boolean;
}

const useDragAndDrop = ({ handleAddImage, emit = false }: Props) => {
  const { processPngInfo } = usePngInfo();
  const dispatch = useAppDispatch();

  useCustomEventListener("custom-dnd", (data) => {
    handleAddImage?.(data);
  });
  const activeLayer = useAppSelector(selectActiveLayer);

  const handleDrop = useCallback(
    (e: DragEvent): void => {
      e.stopPropagation();
      e.preventDefault();

      if (e.dataTransfer) {
        const files = e.dataTransfer.files; // Array of all files

        for (let i = 0, file; (file = files[i]); i++) {
          if (file.type.match(/image.*/)) {
            const reader = new FileReader();

            reader.onload = async (e) => {
              // finished reading file data.
              if (e.target) {
                const dataUrl = e.target.result;
                if (typeof dataUrl === "string") {
                  let pngInfo: PngInfo | undefined;
                  if (activeLayer === "base") {
                    pngInfo = await processPngInfo(dataUrl);

                    pngInfo && updateControlnetArgs(pngInfo, dispatch);
                  }
                  emitImageDropEvent({
                    imageDataUrl: dataUrl,
                    pngInfo,
                  });
                  // handleAddImage({ imageDataUrl: dataUrl, pngInfo });
                }
              }
            };

            reader.readAsDataURL(file); // start reading the file data.
          }
        }
      }
    },
    [activeLayer, dispatch, processPngInfo]
  );

  const handleDragOver = (e: DragEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
  };

  useEffect(() => {
    if (emit) {
      document.addEventListener("dragover", handleDragOver);
      document.addEventListener("drop", handleDrop);
      return () => {
        document.removeEventListener("dragover", handleDragOver);
        document.removeEventListener("drop", handleDrop);
      };
    }
  }, [handleDrop, emit]);
};

export default useDragAndDrop;
