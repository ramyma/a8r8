import { RefObject, useRef } from "react";
import {
  addHistoryItem,
  HistoryItem,
  HistoryTopic,
} from "../state/historySlice";
import { useCustomEventListener } from "react-custom-events";
import { useAppDispatch } from "../hooks";
import Konva from "konva";
import { debugImage, getImage } from "../utils";
import { setLayerImageParams } from "../state/layersSlice";

type Props = {
  stageRef: RefObject<Konva.Stage> | null;
};
type ImageItem = {
  x: number;
  y: number;
  width?: number;
  height?: number;
  dataUrl: string;
  layerId: string;
};

type LayerState = {
  [layerId: string]: ImageItem | undefined;
};

function useLayerState({ stageRef }: Props) {
  const setImage = (historyItem?: ImageItem, layerId?: string) => {
    const layer = historyItem?.layerId ?? layerId;
    if (layer) {
      state.current = {
        ...state.current,
        [layer]: historyItem,
      };
    }
  };

  // const [state, dispatchState] = useReducer(reducer, initialState);
  const state = useRef<LayerState>({});
  const undoHistory = useRef<(ImageItem | undefined)[]>([]);
  const redoHistory = useRef<(ImageItem | undefined)[]>([]);

  const dispatch = useAppDispatch();

  const dispatchHistoryEvent = ({
    label,
    layerId,
  }: {
    label: string;
    layerId: string;
  }) => {
    dispatch(
      addHistoryItem({
        label,
        topic: (topic + layerId) as HistoryTopic,
      })
    );
  };

  const setLayerState = async (historyItem: ImageItem) => {
    if (isDrawingRef.current) {
      drawingBuffer.current = [
        ...drawingBuffer.current,
        { operation: "draw", args: [historyItem] },
      ];
    } else {
      isDrawingRef.current = true;
      undoHistory.current = [
        ...undoHistory.current,
        state.current[historyItem.layerId],
      ];

      setImage(historyItem);
      redoHistory.current = [];

      dispatchHistoryEvent({
        label: "Draw Sketch",
        layerId: historyItem.layerId,
      });

      const layer = stageRef?.current?.getChildren(
        (child) =>
          child instanceof Konva.Layer && child.attrs.id === historyItem.layerId
      )?.[0] as Konva.Layer;

      await setLayerImage({
        historyItem,
        parent: layer,
        dispatch,
      });
      isDrawingRef.current = false;
      consumeBuffer();
    }
  };

  const clearLayer = (layerId: string) => {
    if (isDrawingRef.current) {
      drawingBuffer.current = [
        ...drawingBuffer.current,
        { operation: "clear", args: [layerId] },
      ];
    } else {
      isDrawingRef.current = true;
      const layer = stageRef?.current?.getChildren(
        (child) => child instanceof Konva.Layer && child.attrs.id === layerId
      )?.[0] as Konva.Layer;
      if (
        (
          layer?.children?.find(
            (child) =>
              child instanceof Konva.Group && child.attrs.id == "sketch-image"
          ) as Konva.Group
        )?.children?.length > 0
      ) {
        undoHistory.current = [...undoHistory.current, state.current[layerId]];
        redoHistory.current = [];
        setImage(undefined, layerId);
        setLayerImage({
          parent: layer,
          dispatch,
        });
        dispatchHistoryEvent({ label: "Clear Sketch", layerId });
      }
      isDrawingRef.current = false;

      consumeBuffer();
    }
  };

  const topic = "canvas/sketch";

  const drawingBuffer = useRef<
    { operation: "draw" | "clear" | "undo" | "redo"; args: any[] }[]
  >([]);

  const isDrawingRef = useRef(false);

  const consumeBuffer = () => {
    if (drawingBuffer.current.length) {
      const [firstBufferItem, ...rest] = drawingBuffer.current;
      drawingBuffer.current = rest;

      const { operation, args = [] } = firstBufferItem;
      switch (operation) {
        case "undo":
          undo(...args);
          break;
        case "redo":
          redo(...args);
          break;
        case "draw":
          setLayerState(...args);
          break;
        case "clear":
          clearLayer(...args);
          break;
        default:
          break;
      }
    }
  };

  const undo = async (layerId: string) => {
    if (undoHistory.current.length) {
      if (isDrawingRef.current) {
        drawingBuffer.current = [
          ...drawingBuffer.current,
          { operation: "undo", args: [layerId] },
        ];
      } else {
        isDrawingRef.current = true;

        redoHistory.current = [...redoHistory.current, state.current[layerId]];

        const historyItem = undoHistory.current[undoHistory.current.length - 1];

        setImage(historyItem, layerId);

        undoHistory.current = undoHistory.current.slice(0, -1);

        const layer = stageRef?.current?.getChildren(
          (child) => child instanceof Konva.Layer && child.attrs.id === layerId
        )?.[0] as Konva.Layer;

        await setLayerImage({
          historyItem,
          parent: layer,
          dispatch,
        });
        isDrawingRef.current = false;

        consumeBuffer();
      }
    }
  };

  const redo = async (layerId: string) => {
    if (redoHistory.current.length) {
      if (isDrawingRef.current) {
        drawingBuffer.current = [
          ...drawingBuffer.current,
          { operation: "redo", args: [layerId] },
        ];
      } else {
        isDrawingRef.current = true;

        undoHistory.current = [...undoHistory.current, state.current[layerId]];

        const historyItem = redoHistory.current[redoHistory.current.length - 1];
        setImage(historyItem, layerId);

        redoHistory.current = redoHistory.current.slice(0, -1);

        const layer = stageRef?.current?.getChildren(
          (child) => child instanceof Konva.Layer && child.attrs.id === layerId
        )?.[0] as Konva.Layer;

        await setLayerImage({
          historyItem,
          parent: layer,
          dispatch,
        });
        isDrawingRef.current = false;

        consumeBuffer();
      }
    }
  };

  const handleUndoEvent = async (historyItem: HistoryItem) => {
    if (historyItem.topic.startsWith(topic)) {
      await undo(historyItem.topic.replace(topic, ""));
    }
  };
  useCustomEventListener("custom-undo", handleUndoEvent);

  const handleRedoEvent = async (historyItem: HistoryItem) => {
    if (historyItem.topic.startsWith(topic)) {
      await redo(historyItem.topic.replace(topic, ""));
    }
  };

  useCustomEventListener("custom-redo", handleRedoEvent);

  const addLayerImage = async ({
    imageItem,
    img,
    parent,
  }: {
    imageItem: ImageItem;
    img: CanvasImageSource;
    parent: Konva.Layer;
  }) => {
    const imagesGroup = parent?.getChildren(
      (item) => item instanceof Konva.Group && item.attrs.id == "sketch-image"
    )[0] as Konva.Group;

    const image = await getImage(imageItem.dataUrl);

    imagesGroup.add(
      new Konva.Image({
        image,
        x: imageItem.x,
        y: imageItem.y,
        width: imageItem.width,
        height: imageItem.height,
        imageSmoothingEnabled: false,
      })
    );

    // imagesGroup.add(
    //   new Konva.Rect({
    //     x: imageItem.x,
    //     y: imageItem.y,
    //     width: imageItem.width,
    //     height: imageItem.height,
    //     fill: "red",
    //   })
    // );

    const images = imagesGroup.children;

    const imagesCount = images?.length;

    let minX = imagesCount ? Infinity : imageItem.x;
    let minY = imagesCount ? Infinity : imageItem.y;
    let maxX = imagesCount ? -Infinity : imageItem.x + (imageItem.width ?? 0);
    let maxY = imagesCount ? -Infinity : imageItem.y + (imageItem.height ?? 0);

    images.forEach((image) => {
      const { x, y } = {
        x: image.attrs.x,
        y: image.attrs.y,
      };
      if (x < minX) minX = x;
      if (x + image.width() > maxX) maxX = x + image.width();
      if (y < minY) minY = y;
      if (y + image.height() > maxY) maxY = y + image.height();
    });

    const stagePos = parent.getStage().position();

    const clonedLayer = parent.clone({
      position: stagePos,
      scale: { x: 1, y: 1 },
    });
    clonedLayer.visible(true);
    clonedLayer?.cache({ imageSmoothingEnabled: false });
    // console.log(brushSize);

    const layerDataUrl =
      (await clonedLayer?.toDataURL({
        x: minX + stagePos.x, //stagContainer.clientWidth / 2 - 512 / 2,
        y: minY + stagePos.y,
        width: Math.ceil(maxX - minX),
        height: Math.ceil(maxY - minY),
        imageSmoothingEnabled: false,
        // pixelRatio: 1 / stageRef?.current.scaleX(),
      })) ?? "";
    // parent?.clearCache();
    // stageRef?.current?.scale(oldStageScale);
    // debugImage(layerDataUrl, "test");
    clonedLayer.destroy();
    setLayerState({
      dataUrl: layerDataUrl,
      x: minX,
      y: minY,
      layerId: imageItem.layerId,
    });
  };

  return {
    setLayerImage: setLayerState,
    addLayerImage,
    clearLayer,
  };
}

export default useLayerState;

const setLayerImage = async ({
  historyItem,
  parent,
  dispatch,
}: {
  historyItem?: ImageItem;
  parent: Konva.Layer;
  dispatch: ReturnType<typeof useAppDispatch>;
}) => {
  const img = historyItem && (await getImage(historyItem.dataUrl));
  const imageGroup = parent.getChildren(
    (item) => item instanceof Konva.Group && item.attrs.id == "sketch-image"
  )?.[0] as Konva.Group;
  imageGroup.destroyChildren();

  dispatch(
    setLayerImageParams({
      id: historyItem?.layerId ?? parent.attrs.id,
      image: historyItem
        ? {
            imageDataUrl: historyItem.dataUrl,
            x: historyItem.x,
            y: historyItem.y,
          }
        : undefined,
    })
  );

  if (historyItem) {
    const newImage = new Konva.Image({
      x: historyItem.x,
      y: historyItem.y,
      image: img,
      imageSmoothingEnabled: false,
    });
    imageGroup.add(newImage);
  }
};
