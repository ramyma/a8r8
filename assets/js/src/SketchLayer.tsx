import { Layer, Group, Image } from "react-konva";
import { useAppDispatch, useAppSelector } from "./hooks";
import {
  ActiveLayer,
  selectActiveLayer,
  selectIsSketchLayerVisible,
  selectLayers,
  SketchLayer as SketchLayerType,
} from "./state/layersSlice";
import RefsContext from "./context/RefsContext";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  selectActiveBatchImageResultIndex,
  selectBatchImageResults,
  setBatchImageResults,
} from "./state/canvasSlice";
import { selectBackend } from "./state/optionsSlice";
import { selectSelectionBox } from "./state/selectionBoxSlice";
import Konva from "konva";
import { Vector2d } from "konva/lib/types";
import { ImageItem } from "./state/controlnetSlice";
import {
  emitBatchGenerationProps,
  emitUpdateSeed,
} from "./Canvas/hooks/useCustomEventsListener";
import useBatchGenerationListeners, {
  UseBatchGenerationListenersProps,
} from "./hooks/useBatchGenerationListeners";
import useDragAndDrop from "./hooks/useDragAndDrop";
import SocketContext from "./context/SocketContext";
import useClipboard from "./hooks/useClipboard";
import { setGenerationParams } from "./state/generationParamsSlice";
import { getPngInfo } from "./hooks/usePngInfo";
import { updateStats } from "./state/statsSlice";
import useLayerState from "./hooks/useLayerState";
import { extractSketchLayerId, getImage, isSketchLayer } from "./utils";

const SketchLayer = ({
  addLayerImage,
}: {
  addLayerImage: ReturnType<typeof useLayerState>["addLayerImage"];
}) => {
  const isSketchModeVisible = useAppSelector(selectIsSketchLayerVisible);

  const layers = useAppSelector(selectLayers);

  const { stageRef } = useContext(RefsContext);
  const batchImageResults = useAppSelector(selectBatchImageResults);
  const backend = useAppSelector(selectBackend);
  const activeBatchImageResultIndex = useAppSelector(
    selectActiveBatchImageResultIndex
  );

  const batchGenerationProps = useRef<
    | Omit<
        Parameters<typeof handleAddImage>[0],
        "imageDataUrl" | "isGenerationResult" | "isPreview" | "layer"
      >
    | undefined
  >();
  const dispatch = useAppDispatch();

  const activeLayer = useAppSelector(selectActiveLayer);
  const selectionBox = useAppSelector(selectSelectionBox);

  const handleAddImage = useCallback(
    async ({
      imageDataUrl,
      dimensions,
      position = { x: selectionBox.x, y: selectionBox.y },
      useScaledDimensions = false,
      isGenerationResult = false,
      isPreview = false,
      layer: genLayer = activeLayer,
    }: {
      imageDataUrl: string;
      dimensions?: { width: number; height: number };
      position?: Vector2d;
      useScaledDimensions?: boolean;
      isGenerationResult?: boolean;
      isPreview?: boolean;
      layer: ActiveLayer;
    }) => {
      if (isGenerationResult || isSketchLayer(genLayer)) {
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
          // const image = new konva.Image(imageProps);

          const layer = stageRef?.current?.getChildren(
            (child) =>
              child instanceof Konva.Layer &&
              child.attrs.id === extractSketchLayerId(genLayer ?? activeLayer)
          )?.[0] as Konva.Layer;
          // drawLines({ layer, lines: linesArr });

          // setSketchLines(newLinesArr.concat());
          // clearSketchLines("Clear sketch");
          // const oldStageScale = stageRef?.current?.scale();

          await addLayerImage({
            parent: layer,
            img,
            imageItem: {
              dataUrl: imageDataUrl,
              x: position?.x,
              y: position?.y,
              width: imageProps.width,
              height: imageProps.height,
              layerId: extractSketchLayerId(genLayer ?? activeLayer),
            },
          });
          // imageLayerRef?.current?.add(image);
          // setHistoryStateItem(image, "Add Image");
        }
      }
    },
    [activeLayer, selectionBox, addLayerImage, stageRef]
  );

  const handleApplyActiveBatchImage: UseBatchGenerationListenersProps["handleApplyActiveBatchImage"] =
    (batchImageResultsLayer) => {
      if (
        activeBatchImageResultIndex !== undefined &&
        batchGenerationProps.current &&
        batchImageResults
      ) {
        handleAddImage({
          imageDataUrl: batchImageResults[activeBatchImageResultIndex],
          ...batchGenerationProps.current,
          isGenerationResult: true,
          layer: batchImageResultsLayer,
        });
      }

      batchGenerationProps.current = undefined;
      const seedIncrement =
        backend === "auto" ? (activeBatchImageResultIndex ?? 0) : 0;

      emitUpdateSeed((batchImageSeedRef?.current ?? 0) + seedIncrement);

      dispatch(setBatchImageResults());
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
        const {
          position,
          dimensions,
          useScaledDimensions,
          seed,
          images,
          layer,
        } = data;
        if (images?.length > 1) {
          batchImageSeedRef.current = seed;
          dispatch(setBatchImageResults({ images: images as string[], layer }));
          handleAddImage({
            imageDataUrl: images[0],
            dimensions,
            useScaledDimensions,
            position,
            isGenerationResult: true,
            isPreview: true,
            layer,
          });
        } else {
          const generationParams = await getPngInfo(images[0]);
          dispatch(setGenerationParams(generationParams));
          await handleAddImage({
            imageDataUrl: images[0],
            dimensions,
            useScaledDimensions,
            position,
            isGenerationResult: true,
            layer,
          });
        }

        dispatch(updateStats({ progress: 0, etaRelative: 0 }));
      });
      return () => {
        channel.off("image", ref);
      };
    }
  }, [channel, handleAddImage, dispatch]);

  return (
    <>
      <Layer
        id="scratch"
        imageSmoothingEnabled={false}
        listening={false}
        name="scratch"
      >
        <Group id="lines" />
      </Layer>
      {layers.toReversed().map(({ id, isVisible, image }) => (
        <Layer
          key={id}
          id={`${id}`}
          imageSmoothingEnabled={false}
          visible={isSketchModeVisible && isVisible}
          listening={false}
          name={`sketch${id}`}
        >
          <Group id="sketch-image">
            {/* {image && <SketchImage image={image} />} */}
          </Group>
          {activeLayer === `sketch${id}` && <Group id="lines" />}
        </Layer>
      ))}
    </>
  );
};

const SketchImage = ({
  image,
}: {
  image: NonNullable<SketchLayerType["image"]>;
}) => {
  const [imageState, setImageState] = useState<
    Omit<SketchLayerType["image"], "imageDataUrl"> & {
      imageObj: CanvasImageSource;
    }
  >();

  useEffect(() => {
    async function loadImage(image: NonNullable<SketchLayerType["image"]>) {
      const img = await getImage(image.imageDataUrl);
      setImageState({ imageObj: img, x: image.x, y: image.y });
    }
    loadImage(image);
  }, [image]);
  return imageState ? (
    <Image image={imageState.imageObj} x={imageState.x} y={imageState.y} />
  ) : null;
};

SketchLayer.displayName = "SketchLayer";

export default SketchLayer;
