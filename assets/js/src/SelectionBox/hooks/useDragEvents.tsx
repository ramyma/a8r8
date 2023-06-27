import { KonvaEventObject } from "konva/lib/Node";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { selectMode } from "../../state/canvasSlice";
import RefsContext from "../../context/RefsContext";
import { Vector2d } from "konva/lib/types";
import { roundToClosestMultipleOf8, scalePoint } from "../../utils";
import {
  selectSelectionBox,
  updateSelectionBox,
} from "../../state/selectionBoxSlice";
import useSocket from "../../hooks/useSocket";

const useDragEvents = () => {
  const { stageRef } = useContext(RefsContext);
  const { broadcastSelectionBoxUpdate } = useSocket();
  const mode = useAppSelector(selectMode);
  const { height, width, x, y } = useAppSelector(selectSelectionBox);

  const dispatch = useAppDispatch();

  const selectionAnchorId = useRef<string>("");
  const startingDragPos = useRef<Vector2d>({ x: 0, y: 0 });
  const dragOffset = useRef<Vector2d>({ x: 0, y: 0 });

  const [isTransforming, setIsTransforming] = useState(false);

  const handleStageMouseDown = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (e.evt.buttons === 1 && mode === "selection") {
        selectionAnchorId.current = e.target?.attrs.id;

        const stage = e.target.getStage();

        const pos = scalePoint(
          { x: e.evt.x, y: e.evt.y },
          stage?.scale() ?? { x: 1, y: 1 },
          stage?.position() ?? { x: 0, y: 0 }
        );

        startingDragPos.current = pos;

        if (selectionAnchorId.current === "selectionBox") {
          dragOffset.current = { x: pos.x - x, y: pos.y - y };
        }
      }
    },
    [mode, x, y]
  );

  const handleStageMouseUp = useCallback(() => {
    // FIXME:: handle mouse leaving stage while dragging which get stuck in the dragging state
    selectionAnchorId.current = "";
    const stageContainer = stageRef?.current?.container();
    stageContainer && (stageContainer.style.cursor = "auto");
    setIsTransforming(false);
  }, [stageRef]);

  useEffect(() => {
    const stage = stageRef?.current;
    if (stage) {
      stage.on("mousedown", handleStageMouseDown);
      return () => {
        stage.off("mousedown", handleStageMouseDown);
      };
    }
  }, [handleStageMouseDown, stageRef]);

  useEffect(() => {
    const stage = stageRef?.current;
    if (stage) {
      stage.on("mouseup", handleStageMouseUp);
      return () => {
        stage.off("mouseup", handleStageMouseUp);
      };
    }
  }, [handleStageMouseUp, stageRef]);

  const updateSelectionBoxAndBroadcast = useCallback(
    (selectionBoxUpdate) => {
      dispatch(updateSelectionBox(selectionBoxUpdate));
      //TODO: refactor into useSocket as send presence update
      broadcastSelectionBoxUpdate(selectionBoxUpdate);
    },
    [dispatch, broadcastSelectionBoxUpdate]
  );

  const handleStageMouseMove = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (e.evt.buttons === 1 && mode === "selection") {
        if (
          !isTransforming &&
          selectionAnchorId.current?.toLowerCase().includes("anchor")
        )
          setIsTransforming(true);
        // setMousePos({ x: e.evt.x, y: e.evt.y });
        const stage = e.target.getStage();
        const pos = scalePoint(
          { x: e.evt.x, y: e.evt.y },
          stage?.scale() ?? { x: 1, y: 1 },
          stage?.position() ?? { x: 0, y: 0 }
        );

        if (selectionAnchorId.current === "leftAnchor") {
          const newWidth = roundToClosestMultipleOf8(width + x - pos.x);

          updateSelectionBoxAndBroadcast({
            width: newWidth, //width + x - e.evt.x,
            x: width + x - newWidth, // e.evt.x, // + width - newWidth,
          });
        }
        if (selectionAnchorId.current === "rightAnchor") {
          const newWidth = roundToClosestMultipleOf8(
            width + pos.x - startingDragPos.current.x ////
          );
          startingDragPos.current = {
            ...startingDragPos.current,
            x: newWidth - width + startingDragPos.current.x,
          }; //e.evt.x };
          updateSelectionBoxAndBroadcast({
            width: newWidth, //width + x - e.evt.x,
            // x: width + x - newWidth, // e.evt.x, // + width - newWidth,
          });
        }
        if (selectionAnchorId.current === "topAnchor") {
          const newHeight = roundToClosestMultipleOf8(height + y - pos.y);

          updateSelectionBoxAndBroadcast({
            height: newHeight, //width + x - e.evt.x,
            y: height + y - newHeight, // e.evt.x, // + width - newWidth,
          });
        }
        if (selectionAnchorId.current === "bottomAnchor") {
          const newHeight = roundToClosestMultipleOf8(
            height + pos.y - startingDragPos.current.y
          );
          startingDragPos.current = {
            ...startingDragPos.current,
            y: newHeight - height + startingDragPos.current.y,
          }; //e.evt.x };
          updateSelectionBoxAndBroadcast({
            height: newHeight, //width + x - e.evt.x,
            // x: width + x - newWidth, // e.evt.x, // + width - newWidth,
          });
        }

        if (selectionAnchorId.current === "bottomRightAnchor") {
          const newHeight = roundToClosestMultipleOf8(
            height + pos.y - startingDragPos.current.y
          );
          const newWidth = roundToClosestMultipleOf8(
            width + pos.x - startingDragPos.current.x ////
          );
          startingDragPos.current = {
            y: newHeight - height + startingDragPos.current.y,
            x: newWidth - width + startingDragPos.current.x,
          }; //e.evt.x };
          updateSelectionBoxAndBroadcast({
            width: newWidth,
            height: newHeight, //width + x - e.evt.x,
            // x: width + x - newWidth, // e.evt.x, // + width - newWidth,
          });
        }

        if (selectionAnchorId.current === "topLeftAnchor") {
          const newHeight = roundToClosestMultipleOf8(height + y - pos.y);
          const newWidth = roundToClosestMultipleOf8(width + x - pos.x);

          updateSelectionBoxAndBroadcast({
            width: newWidth, //width + x - e.evt.x,
            height: newHeight, //width + x - e.evt.x,
            x: width + x - newWidth, // e.evt.x, // + width - newWidth,
            y: height + y - newHeight, // e.evt.x, // + width - newWidth,
          });
        }

        if (selectionAnchorId.current === "topRightAnchor") {
          const newWidth = roundToClosestMultipleOf8(
            width + pos.x - startingDragPos.current.x ////
          );
          const newHeight = roundToClosestMultipleOf8(height + y - pos.y);

          startingDragPos.current = {
            ...startingDragPos.current,
            x: newWidth - width + startingDragPos.current.x,
          }; //e.evt.x };
          updateSelectionBoxAndBroadcast({
            width: newWidth, //width + x - e.evt.x,
            height: newHeight, //width + x - e.evt.x,
            y: height + y - newHeight, // e.evt.x, // + width - newWidth,
            // x: width + x - newWidth, // e.evt.x, // + width - newWidth,
          });
        }

        if (selectionAnchorId.current === "bottomLeftAnchor") {
          const newHeight = roundToClosestMultipleOf8(
            height + pos.y - startingDragPos.current.y
          );
          const newWidth = roundToClosestMultipleOf8(width + x - pos.x);

          startingDragPos.current = {
            ...startingDragPos.current,
            y: newHeight - height + startingDragPos.current.y,
          }; //e.evt.x };
          updateSelectionBoxAndBroadcast({
            height: newHeight, //width + x - e.evt.x,
            // x: width + x - newWidth, // e.evt.x, // + width - newWidth,
            width: newWidth, //width + x - e.evt.x,
            x: width + x - newWidth, // e.evt.x, // + selectionBox.width - newWidth,
          });
        }
        if (selectionAnchorId.current === "selectionBox") {
          const newX = Math.round(pos.x - dragOffset.current.x);
          const newY = Math.round(pos.y - dragOffset.current.y);
          startingDragPos.current = {
            x: pos.x,
            y: pos.y,
          };
          // console.log(startingDragPos.current);
          updateSelectionBoxAndBroadcast({
            x: newX,
            y: newY,
          });
        }
      }
    },
    [mode, isTransforming, width, x, updateSelectionBoxAndBroadcast, height, y]
  );

  useEffect(() => {
    const stage = stageRef?.current;
    if (stage) {
      stage.on("mousemove", handleStageMouseMove);
      return () => {
        stage.off("mousemove", handleStageMouseMove);
      };
    }
  }, [handleStageMouseMove, stageRef]);

  return { isTransforming };
};

export default useDragEvents;
