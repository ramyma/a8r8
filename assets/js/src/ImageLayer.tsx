import React, { useCallback, useContext, useEffect } from "react";
import { Layer, Image } from "react-konva";
import RefsContext from "./context/RefsContext";
import SocketContext from "./context/SocketContext";
import { useAppDispatch, useAppSelector } from "./hooks";
import { updateStats } from "./state/statsSlice";

import { Vector2d } from "konva/lib/types";

import useClipboard from "./hooks/useClipboard";
import useDragAndDrop from "./hooks/useDragAndDrop";
import { getPngInfo } from "./hooks/usePngInfo";
import { setGenerationParams } from "./state/generationParamsSlice";
import useHistoryState from "./hooks/useHistoryState";
import { selectActiveLayer } from "./state/layersSlice";
import useCustomEventsListener from "./Canvas/hooks/useCustomEventsListener";
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

  const {
    setHistoryStateItem,
    clearHistoryStateItem,
    state: images,
    setState: setImages,
  } = useHistoryState<ImageItem>({ topic: "canvas/image" });
  const clearImages = () => {
    images?.length && clearHistoryStateItem("Clear Images");
  };
  useCustomEventListener("customClearBaseImages", clearImages); // useEffect(() => {
  //   // clear preview image when progress is reset
  //   if (progress === 0 && previewImg) setPreviewImg(undefined);
  // }, [previewImg, progress]);

  const handleAddImage = useCallback(
    ({
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

        const newImage = {
          img,
          x: position?.x ?? 0,
          y: position?.y ?? 0,
          ...(useScaledDimensions &&
            dimensions && {
              width: dimensions.width,
              height: dimensions.height,
            }),
        };

        const date = new Date();
        console.log("ADDDD", date, date.getMilliseconds());
        setHistoryStateItem(newImage, "Add Image");
        setImages((images) => [...images, newImage]);
      }
    },
    [activeLayer, selectionBox, setHistoryStateItem, setImages]
  );

  useClipboard({ handleAddImage });
  useDragAndDrop({ handleAddImage });

  const { channel } = useContext(SocketContext);

  useEffect(() => {
    if (channel) {
      const ref = channel.on("image", async (data) => {
        console.log(data);
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

  return (
    <Layer imageSmoothingEnabled={false} ref={imageLayerRef} id="imageLayer">
      {images.map(({ img, x, y, width, height }, i) => (
        <Image
          key={i}
          image={img}
          x={x}
          y={y}
          {...(width && { width, height })}
        />
      ))}
    </Layer>
  );
};

ImageLayer.displayName = "ImageLayer";

export default ImageLayer;
