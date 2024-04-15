import React, { useCallback, useContext, useEffect } from "react";
import { Layer } from "react-konva";
import konva from "konva";
import RefsContext from "./context/RefsContext";
import SocketContext from "./context/SocketContext";
import { useAppDispatch, useAppSelector } from "./hooks";
import { updateStats } from "./state/statsSlice";

import { Vector2d } from "konva/lib/types";

import useClipboard from "./hooks/useClipboard";
import useDragAndDrop from "./hooks/useDragAndDrop";
import { getPngInfo } from "./hooks/usePngInfo";
import { setGenerationParams } from "./state/generationParamsSlice";
import useHistoryState, {
  Props as useHistoryStateProps,
} from "./hooks/useHistoryState";
import { selectActiveLayer } from "./state/layersSlice";

import { useCustomEventListener } from "react-custom-events";
import { selectSelectionBox } from "./state/selectionBoxSlice";

type ImageItem = {
  img: HTMLImageElement;
  x: number;
  y: number;
  width?: number;
  height?: number;
  scale?: number;
};

const ImageLayer = () => {
  // const previewImageRef = useRef<ImageType | null>(null);

  const { imageLayerRef } = useContext(RefsContext);

  const dispatch = useAppDispatch();

  const activeLayer = useAppSelector(selectActiveLayer);
  const selectionBox = useAppSelector(selectSelectionBox);

  const undoCallback = useCallback<
    Required<useHistoryStateProps<konva.Image>>["undoCallback"]
  >(
    ({ items, isStateEmpty }) => {
      if (isStateEmpty) {
        imageLayerRef?.current?.add(...items);
      } else {
        items.forEach((item) => {
          item?.destroy();
        });
      }
    },
    [imageLayerRef]
  );

  const redoCallback = useCallback<
    Required<useHistoryStateProps<konva.Image>>["redoCallback"]
  >(
    (items) => {
      if (items.length > 0) {
        imageLayerRef?.current?.add(...items);
      } else {
        imageLayerRef?.current?.destroyChildren();
      }
    },
    [imageLayerRef]
  );

  const clearCallback = useCallback(() => {
    imageLayerRef?.current?.destroyChildren();
  }, [imageLayerRef]);

  const {
    setHistoryStateItem,
    clearHistoryStateItem,
    state: images,
    setState: setImages,
  } = useHistoryState<konva.Image>({
    topic: "canvas/image",
    undoCallback,
    redoCallback,
    clearCallback,
  });

  const clearImages = () => {
    images?.length && clearHistoryStateItem("Clear Images");
  };

  useCustomEventListener("customClearBaseImages", clearImages);

  const handleAddImage = useCallback(
    async ({
      imageDataUrl,
      dimensions,
      position = { x: selectionBox.x, y: selectionBox.y },
      useScaledDimensions,
      isGenerationResult = false,
    }: {
      imageDataUrl: string;
      dimensions?: { width: number; height: number };
      position?: Vector2d;
      useScaledDimensions?: boolean;
      isGenerationResult?: boolean;
    }) => {
      if (isGenerationResult || activeLayer === "base") {
        const img = new window.Image();
        img.src = imageDataUrl;

        const newImage: ImageItem = {
          img,
          x: position?.x ?? 0,
          y: position?.y ?? 0,
          ...(useScaledDimensions &&
            dimensions && {
              width: dimensions.width,
              height: dimensions.height,
            }),
        };

        // for (let index = 0; index < 2000; index++) {
        const image = new konva.Image({
          image: img,
          x: newImage.x,
          y: newImage.y,
          width: newImage.width,
          height: newImage.height,
        });

        imageLayerRef?.current?.add(image);

        setHistoryStateItem(image, "Add Image");
      }
    },
    [activeLayer, imageLayerRef, selectionBox, setHistoryStateItem]
  );

  useClipboard({ handleAddImage });
  useDragAndDrop({ handleAddImage });

  const { channel } = useContext(SocketContext);

  useEffect(() => {
    if (channel) {
      const ref = channel.on("image", async (data) => {
        const { image, position, dimensions, useScaledDimensions, seed } = data;
        const generationParams = await getPngInfo(image);
        dispatch(setGenerationParams(generationParams));

        handleAddImage({
          imageDataUrl: image,
          dimensions,
          useScaledDimensions,
          position,
          isGenerationResult: true,
        });

        dispatch(updateStats({ progress: 0, etaRelative: 0 }));
      });
      return () => {
        channel.off("image", ref);
      };
    }
  }, [channel, handleAddImage, dispatch]);
  // TODO: stress test with many images; explore caching

  return (
    <Layer
      listening={false}
      imageSmoothingEnabled={false}
      ref={imageLayerRef}
      id="imageLayer"
    />
  );
};

ImageLayer.displayName = "ImageLayer";

export default ImageLayer;
