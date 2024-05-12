import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Group, Image, Layer } from "react-konva";
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
import {
  selectActiveBatchImageResultIndex,
  selectBatchImageResults,
  selectBatchPreviewIsVisible,
  setBatchImageResults,
} from "./state/canvasSlice";
import useBatchGenerationListeners, {
  UseBatchGenerationListenersProps,
} from "./hooks/useBatchGenerationListeners";
import {
  emitBatchGenerationProps,
  emitUpdateSeed,
} from "./Canvas/hooks/useCustomEventsListener";
import { selectBackend } from "./state/optionsSlice";

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
  const batchImageResults = useAppSelector(selectBatchImageResults);
  const backend = useAppSelector(selectBackend);
  const activeBatchImageResultIndex = useAppSelector(
    selectActiveBatchImageResultIndex
  );

  const batchGenerationProps = useRef<
    | Omit<
        Parameters<typeof handleAddImage>[0],
        "imageDataUrl" | "isGenerationResult" | "isPreview"
      >
    | undefined
  >();
  const dispatch = useAppDispatch();

  const activeLayer = useAppSelector(selectActiveLayer);
  const selectionBox = useAppSelector(selectSelectionBox);
  const batchPreviewIsVisible = useAppSelector(selectBatchPreviewIsVisible);

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
      useScaledDimensions = false,
      isGenerationResult = false,
      isPreview = false,
    }: {
      imageDataUrl: string;
      dimensions?: { width: number; height: number };
      position?: Vector2d;
      useScaledDimensions?: boolean;
      isGenerationResult?: boolean;
      isPreview?: boolean;
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
        const imageProps = {
          image: img,
          x: newImage.x,
          y: newImage.y,
          width: newImage.width,
          height: newImage.height,
        };

        if (isPreview) {
          emitBatchGenerationProps(imageProps);
          batchGenerationProps.current = {
            dimensions,
            position,
            useScaledDimensions,
          };
        } else {
          const image = new konva.Image(imageProps);
          imageLayerRef?.current?.add(image);
          setHistoryStateItem(image, "Add Image");
        }
      }
    },
    [activeLayer, imageLayerRef, selectionBox, setHistoryStateItem]
  );

  const handleApplyActiveBatchImage: UseBatchGenerationListenersProps["handleApplyActiveBatchImage"] =
    () => {
      activeBatchImageResultIndex !== undefined &&
        batchGenerationProps.current &&
        batchImageResults &&
        handleAddImage({
          imageDataUrl: batchImageResults[activeBatchImageResultIndex],
          ...batchGenerationProps.current,
          isGenerationResult: true,
        });

      batchGenerationProps.current = undefined;
      const seedIncrement =
        backend === "auto" ? activeBatchImageResultIndex ?? 0 : 0;

      emitUpdateSeed((batchImageSeedRef?.current ?? 0) + seedIncrement);

      dispatch(setBatchImageResults([]));
    };

  useBatchGenerationListeners({
    handleApplyActiveBatchImage,
  });

  useClipboard({ handleAddImage });
  useDragAndDrop({ handleAddImage });

  const { channel } = useContext(SocketContext);

  const batchImageSeedRef = useRef();

  useEffect(() => {
    if (channel) {
      const ref = channel.on("image", async (data) => {
        const { position, dimensions, useScaledDimensions, seed, images } =
          data;
        if (images?.length > 1) {
          batchImageSeedRef.current = seed;
          dispatch(setBatchImageResults(images as string[]));
          handleAddImage({
            imageDataUrl: images[0],
            dimensions,
            useScaledDimensions,
            position,
            isGenerationResult: true,
            isPreview: true,
          });
        } else {
          const generationParams = await getPngInfo(images[0]);
          dispatch(setGenerationParams(generationParams));
          handleAddImage({
            imageDataUrl: images[0],
            dimensions,
            useScaledDimensions,
            position,
            isGenerationResult: true,
          });
        }

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
