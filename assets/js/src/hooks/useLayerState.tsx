import { RefObject, useReducer, useState } from "react";
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

const initialState: LayerState = {};

const removeLayerFromState = (state, layerId) => {
  const { [layerId]: _, ...rest } = state;
  return rest;
};

function reducer(
  state: LayerState,
  action: { type: string; payload: { layerId: string; data?: ImageItem } }
): LayerState {
  const { layerId, data } = action.payload;

  switch (action.type) {
    case "SET_LAYER_STATE":
      return {
        ...state,
        [layerId]: data,
      };
    case "REMOVE_LAYER_STATE":
      return removeLayerFromState(state, layerId);
    default:
      return state;
  }
}

function useLayerState({ stageRef }: Props) {
  const setImage = (historyItem?: ImageItem, layerId?: string) => {
    const layer = historyItem?.layerId ?? layerId;
    if (layer) {
      dispatchState({
        type: "SET_LAYER_STATE",
        payload: { layerId: layer, data: historyItem },
      });
    }
  };

  const [state, dispatchState] = useReducer(reducer, initialState);
  const [undoHistory, setUndoHistory] = useState<(ImageItem | undefined)[]>([]);
  const [redoHistory, setRedoHistory] = useState<(ImageItem | undefined)[]>([]);

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
    // if (layerRef) {
    setUndoHistory((undoHistory) => [
      ...undoHistory,
      state[historyItem.layerId],
    ]);
    setImage(historyItem);

    const layer = stageRef?.current?.getChildren(
      (child) =>
        child instanceof Konva.Layer && child.attrs.id === historyItem.layerId
    )?.[0] as Konva.Layer;

    await setLayerImage({
      historyItem,
      parent: layer,
      dispatch,
    });

    setRedoHistory([]);
    dispatchHistoryEvent({
      label: "Draw Sketch",
      layerId: historyItem.layerId,
    });
    // }
  };

  const clearLayer = (layerId: string) => {
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
      setUndoHistory((undoHistory) => [...undoHistory, state[layerId]]);
      setRedoHistory([]);
      setImage(undefined, layerId);
      setLayerImage({
        parent: layer,
        dispatch,
      });
      dispatchHistoryEvent({ label: "Clear Sketch", layerId });
    }
  };

  const topic = "canvas/sketch";

  const undo = async (layerId: string) => {
    if (undoHistory.length) {
      setRedoHistory((redoHistory) => [...redoHistory, state[layerId]]);

      const historyItem = undoHistory[undoHistory.length - 1];
      setImage(historyItem, layerId);
      const layer = stageRef?.current?.getChildren(
        (child) => child instanceof Konva.Layer && child.attrs.id === layerId
      )?.[0] as Konva.Layer;

      setLayerImage({
        historyItem,
        parent: layer,
        dispatch,
      });

      setUndoHistory((undoHistory) => undoHistory.slice(0, -1));
    }
  };

  const redo = async (layerId: string) => {
    if (redoHistory.length) {
      setUndoHistory((undoHistory) => [...undoHistory, state[layerId]]);

      const historyItem = redoHistory[redoHistory.length - 1];
      setImage(historyItem, layerId);
      const layer = stageRef?.current?.getChildren(
        (child) => child instanceof Konva.Layer && child.attrs.id === layerId
      )?.[0] as Konva.Layer;

      setLayerImage({
        historyItem,
        parent: layer,
        dispatch,
      });

      setRedoHistory((redoHistory) => redoHistory.slice(0, -1));
    }
  };

  useCustomEventListener("custom-undo", (historyItem: HistoryItem) => {
    if (historyItem.topic.startsWith(topic)) {
      undo(historyItem.topic.replace(topic, ""));
    }
  });
  useCustomEventListener("custom-redo", (historyItem: HistoryItem) => {
    if (historyItem.topic.startsWith(topic)) {
      redo(historyItem.topic.replace(topic, ""));
    }
  });

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
    debugImage(layerDataUrl, "test");
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
