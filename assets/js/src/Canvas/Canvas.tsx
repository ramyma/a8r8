import React, {
  KeyboardEvent,
  Ref,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { KonvaEventObject } from "konva/lib/Node";
import { Stage } from "react-konva";
import { Vector2d } from "konva/lib/types";
import SelectionLayer from "../SelectionLayer";
import ImageLayer from "../ImageLayer";
import { Stage as StageType } from "konva/lib/Stage";
import MaskLayer from "../MaskLayer";
import { BrushStroke } from "../MaskLayer-types";

import {
  decrementBrushSize,
  incrementBrushSize,
  updateStageScale,
  selectBrushSize,
  selectBrushColor,
  selectIsColorPickerVisible,
  toggleColorPickerVisibility,
  selectMode,
  setMode,
  selectTool,
  setTool,
  updateStagePosition,
  setIsbrushPreviewVisible,
} from "../state/canvasSlice";
import {
  selectControlnetLines,
  selectControlnetMaskLines,
  selectRegionMaskLines,
  setControlnetLines,
  setControlnetMaskLines,
  setRegionMaskLines,
} from "../state/linesSlice";
import OverlayLayer, { BrushPreviewNode } from "../OverlayLayer";
import { useAppDispatch, useAppSelector } from "../hooks";
import RefsContext from "../context/RefsContext";
import SketchLayer from "../SketchLayer";
import ColorPicker from "../ColorPicker";
import ControlnetLayer from "../ControlnetLayer";
import {
  ActiveLayer,
  selectActiveControlnetId,
  selectActiveLayer,
  selectActivePromptRegionId,
  setActiveLayer,
  toggleMaskLayerVisibility,
} from "../state/layersSlice";
// import { setMaskLines as setStateMaskLines } from "./state/canvasSlice";

import { roundToClosestMultipleOf8, scalePoint } from "../utils";
import useGlobalKeydown from "../hooks/useGlobalKeydown";
import { selectGenerationParams } from "../state/generationParamsSlice";
import {
  DEFAULT_HEIGHT_VALUE,
  DEFAULT_WIDTH_VALUE,
  updateSelectionBox,
} from "../state/selectionBoxSlice";
import useHistoryState from "../hooks/useHistoryState";
import useSocket from "../hooks/useSocket";
import useCustomEventsListener from "./hooks/useCustomEventsListener";
import { CanvasDimensions } from "./Canvas.d";
import { Rect } from "konva/lib/shapes/Rect";
import { addHistoryItem } from "../state/historySlice";
import useLines from "./hooks/useLines";

const SCALE_BY = 1.1;
// const BRUSH_SIZE = 40;
const MIN_SCALE = 0.11;

export default function Canvas() {
  const { broadcastSelectionBoxUpdate } = useSocket();
  const {
    stageRef,
    selectionBoxRef,
    canvasContainerRef: ref,
  } = useContext(RefsContext);
  // const stageRef = useRef<StageType | null>(null);
  const { imageLayerRef } = useContext(RefsContext);
  const [dimensions, setDimensions] = useState<CanvasDimensions>();
  const [, setScale] = useState<Vector2d>({ x: 1.0, y: 1.0 });
  // const [position, setPosition] = useState<Vector2d>({ x: 0, y: 0 });
  // const [maskLines, setMaskLines] = useState<BrushStroke[]>([]);
  const {
    setHistoryStateItem: setMaskState,
    clearHistoryStateItem: clearMaskLines,
    state: maskLines,
    setState: setMaskLines,
  } = useHistoryState<BrushStroke>({ topic: "canvas/mask" });

  const {
    setHistoryStateItem: setSketchState,
    clearHistoryStateItem: clearSketchLines,
    dispatchHistoryEvent: _dispatchSketchHistoryEvent,
    state: sketchLines,
    setState: setSketchLines,
  } = useHistoryState<BrushStroke>({ topic: "canvas/sketch" });

  const dispatch = useAppDispatch();

  const [tempControlnetLines, dispatchTempControlnetLines] = useLines();
  const controlnetLines = useAppSelector(selectControlnetLines);
  const dispatchControlnetLines = useCallback(
    (lines) => {
      dispatch(setControlnetLines(lines));
    },
    [dispatch]
  );

  const [tempControlnetMaskLines, dispatchTempControlnetMaskLines] = useLines();
  const controlnetMaskLines = useAppSelector(selectControlnetMaskLines);
  const dispatchControlnetMaskLines = useCallback(
    (lines) => {
      dispatch(setControlnetMaskLines(lines));
    },
    [dispatch]
  );

  const regionMaskLines = useAppSelector(selectRegionMaskLines);

  const [tempRegionMaskLines, dispatchTempRegionMaskLines] = useLines();

  const dispatchRegionMaskLines = useCallback(
    (lines) => {
      dispatch(setRegionMaskLines(lines));
    },
    [dispatch]
  );

  const [, setRefresher] = useState<number>(0);

  const tool = useAppSelector(selectTool);
  const isDrawing = useRef(false);
  const brushPreviewRef = useRef<BrushPreviewNode>();
  const brushSize = useAppSelector(selectBrushSize);
  // const [color, setColor] = useState<string>("");
  const brushColor = useAppSelector(selectBrushColor);
  const mode = useAppSelector(selectMode);
  const activeLayer = useAppSelector(selectActiveLayer);
  const isColorPickerVisible = useAppSelector(selectIsColorPickerVisible);

  // const generationParams = useAppSelector(selectGenerationParams);

  const activeControlnetLayerId = useAppSelector(selectActiveControlnetId);
  const activeRegionMaskLayerId = useAppSelector(selectActivePromptRegionId);

  const getControlnetLayerLines = useCallback(
    () =>
      typeof activeControlnetLayerId === "string"
        ? ((activeLayer.endsWith("mask")
            ? tempControlnetMaskLines[activeControlnetLayerId]
            : tempControlnetLines[activeControlnetLayerId]) ?? [])
        : [],
    [
      activeControlnetLayerId,
      activeLayer,
      tempControlnetLines,
      tempControlnetMaskLines,
    ]
  );

  const setControlnetLayerLines = useCallback(
    (
      arg: BrushStroke[] | ((lines: BrushStroke[]) => BrushStroke[]),
      layerId?: string,
      isClear?: boolean,
      updateGlobalState?: boolean
    ) => {
      // hack to rerender on controlnet lines update
      setRefresher((prev) => prev + 1);

      const layer = isClear && layerId ? layerId : activeLayer;

      layerId = layer.includes("controlnet")
        ? layer.replace(/(controlnet|(-mask))/g, "")
        : activeControlnetLayerId;

      if (layer.includes("controlnet") && layerId)
        if (Array.isArray(arg)) {
          const lines = arg;
          if (layer.endsWith("mask")) {
            if (updateGlobalState) {
              dispatchControlnetMaskLines({ id: layerId, lines });
              dispatchTempControlnetMaskLines({
                type: "CLEAR",
              });
              dispatch(
                addHistoryItem({
                  label: "Add contronnet line",
                  topic: "canvas/line",
                })
              );
            } else {
              dispatchTempControlnetMaskLines({
                type: "UPDATE",
                payload: { id: layerId, lines },
              });
            }
          } else {
            if (updateGlobalState) {
              dispatchControlnetLines({ id: layerId, lines });
              dispatchTempControlnetLines({
                type: "CLEAR",
              });
              dispatch(
                addHistoryItem({
                  label: "Add contronnet line",
                  topic: "canvas/line",
                })
              );
            } else {
              dispatchTempControlnetLines({
                type: "UPDATE",
                payload: { id: layerId, lines },
              });
            }
          }
        } else {
          if (layer.endsWith("mask")) {
            const lines = arg(controlnetMaskLines[layerId] ?? []);

            dispatchTempControlnetMaskLines({
              type: "UPDATE",
              payload: { id: layerId, lines },
            });
          } else {
            const lines = arg(controlnetLines[layerId] ?? []);
            dispatchTempControlnetLines({
              type: "UPDATE",
              payload: { id: layerId, lines },
            });
          }
        }
    },
    [
      activeLayer,
      activeControlnetLayerId,
      dispatchControlnetMaskLines,
      dispatchTempControlnetMaskLines,
      dispatch,
      dispatchControlnetLines,
      dispatchTempControlnetLines,
      controlnetMaskLines,
      controlnetLines,
    ]
  );

  const getRegionMaskLayerLines = useCallback(
    () =>
      typeof activeRegionMaskLayerId === "string"
        ? (tempRegionMaskLines[activeRegionMaskLayerId] ?? [])
        : [],
    [activeRegionMaskLayerId, tempRegionMaskLines]
  );
  const setRegionMaskLayerLines = useCallback(
    (
      arg: BrushStroke[] | ((lines: BrushStroke[]) => BrushStroke[]),
      layerId?: string,
      isClear?: boolean,
      updateGlobalState?: boolean
    ) => {
      // hack to rerender on controlnet lines update
      setRefresher((prev) => prev + 1);

      const layer = isClear && layerId ? layerId : activeLayer;

      layerId = layer.includes("regionMask")
        ? layer.replace("regionMask", "")
        : activeControlnetLayerId;

      if (layer.includes("regionMask") && layerId)
        if (Array.isArray(arg)) {
          const lines = arg;
          if (updateGlobalState) {
            dispatchRegionMaskLines({ id: layerId, lines });
            dispatchTempRegionMaskLines({
              type: "CLEAR",
            });
            dispatch(
              addHistoryItem({
                label: "Add region mask line",
                topic: "canvas/line",
              })
            );
          } else {
            dispatchTempRegionMaskLines({
              type: "UPDATE",
              payload: { id: layerId, lines },
            });
          }
        } else {
          const lines = arg(regionMaskLines[layerId] ?? []);
          dispatchTempRegionMaskLines({
            type: "UPDATE",
            payload: { id: layerId, lines },
          });
        }
    },
    [
      activeLayer,
      activeControlnetLayerId,
      dispatchRegionMaskLines,
      dispatchTempRegionMaskLines,
      dispatch,
      regionMaskLines,
    ]
  );
  const clearLines = useCallback(
    (layer: ActiveLayer = activeLayer) => {
      if (layer === "mask" && maskLines.length > 0) {
        clearMaskLines("Clear mask");
      }
      if (layer.startsWith("regionMask")) {
        // const layerId = layer.replace("regionMask", "");
        setRegionMaskLayerLines([], layer, true, true);
      }
      if (layer === "sketch" && sketchLines.length > 0) {
        clearSketchLines("Clear sketch");
      }
      if (layer.startsWith("controlnet")) {
        // const layerId = layer.replace("controlnet", "");
        setControlnetLayerLines([], layer, true, true);
      }
    },
    [
      activeLayer,
      maskLines.length,
      sketchLines.length,
      clearMaskLines,
      setRegionMaskLayerLines,
      clearSketchLines,
      setControlnetLayerLines,
    ]
  );

  useCustomEventsListener({ clearLines });

  useLayoutEffect(() => {
    if (ref?.current) {
      setDimensions({
        width: ref.current.clientWidth,
        height: ref.current.clientHeight,
      });
      const selectionBoxInitialPos = {
        x: roundToClosestMultipleOf8(
          Math.floor(ref.current.clientWidth / 2 - 512 / 2)
        ),
        y: roundToClosestMultipleOf8(
          Math.floor(ref.current.clientHeight / 2 - 512 / 2)
        ),
      };
      dispatch(updateSelectionBox(selectionBoxInitialPos));
      broadcastSelectionBoxUpdate({
        ...selectionBoxInitialPos,
        width: DEFAULT_WIDTH_VALUE,
        height: DEFAULT_HEIGHT_VALUE,
      });
    }
  }, [dispatch, broadcastSelectionBoxUpdate, ref]);

  const zoomCanvas = useCallback(
    (stage: StageType, direction: number) => {
      if ((stage?.scaleX() ?? 1) > MIN_SCALE || direction > 0) {
        const oldScale = stage?.scale() ?? { x: 1, y: 1 };
        const pointer = stage?.getPointerPosition() ?? { x: 0, y: 0 };
        const stagePosition = stage?.getPosition() ?? { x: 0, y: 0 };
        const mousePointTo = scalePoint(pointer, oldScale, stagePosition);

        const scaleComponent = Math.min(
          10,
          direction > 0 ? oldScale.x * SCALE_BY : oldScale.x / SCALE_BY
        );
        const newScale = { x: scaleComponent, y: scaleComponent };

        dispatch(updateStageScale(newScale.x));

        stage?.scale(newScale);
        // newScale = Math.round(newScale * 100) / 100;
        // console.log({ newScale });

        setScale(newScale);

        // brushPreviewRef?.current?.radius(brushSize / 2 / newScale.x);
        // console.log(brushSize, newScale);
        // dispatch(updateBrushSize(brushSize / newScale.x));

        //TODO: update brush size in state
        const newPos = {
          x: pointer.x - mousePointTo.x * newScale.x,
          y: pointer.y - mousePointTo.y * newScale.y,
        };
        // setPosition(newPos);
        stage?.position(newPos);
      }
    },
    [dispatch]
  );

  const handleWindowResize = useCallback(() => {
    if (ref?.current) {
      setDimensions({
        width: ref.current.clientWidth,
        height: ref.current.clientHeight,
      });
    }
  }, [ref]);

  useEffect(() => {
    window.addEventListener("resize", handleWindowResize);
    return () => {
      window.removeEventListener("resize", handleWindowResize);
    };
  }, [handleWindowResize]);

  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    // stop default scrolling
    e.evt.preventDefault();

    // const stage = e.currentTarget;
    const stage = stageRef?.current;
    // how to scale? Zoom in? Or zoom out?
    let direction = e.evt.deltaY > 0 ? -1 : 1;

    // when we zoom on trackpad, e.evt.ctrlKey is true
    // in that case lets revert direction
    if (e.evt.ctrlKey) {
      // TODO: control brush size instead
      direction = -direction;
    }
    stage && zoomCanvas(stage, direction);
  };

  const handleKeydown = useCallback(
    async (e: KeyboardEvent) => {
      if (e.key === "1") {
        const stage = stageRef?.current;
        const oldScale = stage?.scale() ?? { x: 1, y: 1 };
        const stagePosition = stage?.getPosition() ?? { x: 0, y: 0 };

        stage?.scale({ x: 1, y: 1 });
        const pointer = stage?.getPointerPosition() ?? { x: 0, y: 0 };
        const mousePointTo = scalePoint(pointer, oldScale, stagePosition);

        const newPos = {
          x: pointer.x - mousePointTo.x,
          y: pointer.y - mousePointTo.y,
        };
        stageRef?.current?.position(newPos); //{ x: 0, y: 0 });
        dispatch(updateStagePosition(newPos));
        dispatch(updateStageScale(1));
      }
      if (e.key === "+") {
        const stage = stageRef?.current;
        const direction = 1;

        stage && zoomCanvas(stage, direction);
      }
      if (e.key === "-") {
        const stage = stageRef?.current;
        const direction = -1;

        stage && zoomCanvas(stage, direction);
      }
      if (e.key === "[") {
        if (brushSize > 5) dispatch(decrementBrushSize(e.ctrlKey ? 0.1 : 1));
      }
      if (e.key === "{") {
        if (brushSize > 5) dispatch(decrementBrushSize(10));
      }
      if (e.key === "]") {
        dispatch(incrementBrushSize(e.ctrlKey ? 0.1 : 1));
      }
      if (e.key === "}") {
        dispatch(incrementBrushSize(10));
      }
      if (e.key.toLocaleLowerCase() === "c" && !e.ctrlKey) {
        clearLines();
      }
      if (e.key.toLocaleLowerCase() === "e") {
        if (tool !== "eraser") dispatch(setTool("eraser"));
      }
      if (e.key.toLocaleLowerCase() === "t") {
        if (tool === "brush") dispatch(setTool("eraser"));
        else dispatch(setTool("brush"));
      }
      if (e.key.toLocaleLowerCase() === "p" && !e.ctrlKey && !e.altKey) {
        dispatch(toggleColorPickerVisibility());
      }
      if (e.key.toLocaleLowerCase() === "h") {
        dispatch(toggleMaskLayerVisibility());
      }
      if (e.key.toLocaleLowerCase() === "s" && e.ctrlKey) {
        e.preventDefault();
        await saveImage(stageRef, imageLayerRef, selectionBoxRef);
      } else if (e.key.toLocaleLowerCase() === "s") {
        if (mode === "selection") dispatch(setMode("paint"));
        else dispatch(setMode("selection"));
      }

      if (e.key.toLocaleLowerCase() === "m") {
        if (activeLayer === "mask") {
          dispatch(setActiveLayer("sketch"));
        } else {
          dispatch(setActiveLayer("mask"));
        }
      }
    },
    [
      stageRef,
      dispatch,
      zoomCanvas,
      brushSize,
      clearLines,
      tool,
      selectionBoxRef,
      imageLayerRef,
      mode,
      activeLayer,
    ]
  );
  useGlobalKeydown({ handleKeydown });

  const handleMouseDown = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (
        e.evt.buttons === 1 &&
        mode === "paint" &&
        activeLayer !== "base"
        //["mask", "sketch", "controlnet"].includes(activeLayer)
      ) {
        isDrawing.current = true;
        const stage = e.target.getStage();
        const pos: Vector2d = scalePoint(
          stage?.getPointerPosition() ?? { x: 0, y: 0 },
          stage?.scale() ?? { x: 1, y: 1 },
          stage?.position() ?? { x: 0, y: 0 }
        );
        const setFunc =
          activeLayer === "mask"
            ? setMaskLines
            : activeLayer.startsWith("regionMask")
              ? setRegionMaskLayerLines
              : activeLayer === "sketch"
                ? setSketchLines
                : setControlnetLayerLines;

        setFunc((lines) => [
          ...lines,
          {
            tool,
            points: [pos.x, pos.y],
            brushColor,
            brushSize, //: brushSize / stage.scaleX(),
          },
        ]);
      }
      // if (e.evt.buttons === 1 && mode === "selection") {
      //   selectionAnchorId.current = e.target.attrs.id;
      //   const stage: StageType | null = e.target.getStage();

      //   const pos = scalePoint(
      //     { x: e.evt.x, y: e.evt.y },
      //     stage?.scale() ?? { x: 1, y: 1 },
      //     stage?.position() ?? { x: 0, y: 0 }
      //   );
      //   startingDragPos.current = pos;
      // }
    },
    [
      mode,
      activeLayer,
      setMaskLines,
      setRegionMaskLayerLines,
      setSketchLines,
      setControlnetLayerLines,
      tool,
      brushColor,
      brushSize,
    ]
  );

  const handleMouseMove = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      const stage: StageType | null = e.target.getStage();
      // dispatch(
      //   updateBrushPreviewPosition({
      //     x:
      //       stage.getPointerPosition().x / stage.scaleX() -
      //       stage.x() / stage.scaleX(),
      //     y:
      //       stage.getPointerPosition().y / stage.scaleY() -
      //       stage.y() / stage.scaleY(),
      //   })
      // );
      if (brushPreviewRef.current) {
        brushPreviewRef.current.position(
          scalePoint(
            stage?.getPointerPosition() ?? { x: 0, y: 0 },
            stage?.getAbsoluteScale() ?? { x: 1, y: 1 },
            stage?.getPosition() ?? { x: 0, y: 0 }
          )
        );
      }

      if (activeLayer !== "base") {
        if (e.evt.buttons === 1) {
          // // no drawing - skipping
          if (!isDrawing.current) {
            return;
          }

          const stage: StageType | null = e.target.getStage();
          const point = scalePoint(
            stage?.getPointerPosition() ?? { x: 0, y: 0 },
            stage?.scale() ?? { x: 1, y: 1 },
            stage?.position() ?? { x: 0, y: 0 }
          );

          const linesArr =
            activeLayer === "mask"
              ? maskLines
              : activeLayer.startsWith("regionMask")
                ? getRegionMaskLayerLines()
                : activeLayer === "sketch"
                  ? sketchLines
                  : getControlnetLayerLines();
          const lastLine = linesArr[linesArr.length - 1];
          // add point
          // lastLine.points = lastLine.points.concat([point.x, point.y]);
          const newLastLine = {
            ...lastLine,
            points: lastLine.points.concat([point.x, point.y]),
          };

          // replace last
          // linesArr.splice(linesArr.length - 1, 1, newLastLine);
          const newLinesArr = linesArr.slice(0, linesArr.length - 1);
          newLinesArr.push(newLastLine);

          if (activeLayer === "mask") {
            setMaskLines(newLinesArr.concat());
            // dispatch;
            // dispatch(setStateMaskLines(newLinesArr.concat()));
          }

          if (activeLayer.startsWith("regionMask"))
            setRegionMaskLayerLines(newLinesArr.concat());

          if (activeLayer === "sketch") setSketchLines(newLinesArr.concat());

          if (activeLayer.startsWith("controlnet"))
            setControlnetLayerLines(newLinesArr.concat());
        }
      }
      if (e.evt.buttons === 4) {
        e.evt.stopPropagation();
        // imageLayerRef?.current?.cache({ drawBorder: true });

        if (stage) {
          e.evt.preventDefault();
          // setPosition((position) => ({
          //   x: position.x + e.evt.movementX,
          //   y: position.y + e.evt.movementY,
          // }));
          const pos = {
            x: stage.x() + e.evt.movementX,
            y: stage.y() + e.evt.movementY,
          };

          stage.setPosition(pos);

          dispatch(
            updateStagePosition({
              x: stage.x() + e.evt.movementX,
              y: stage.y() + e.evt.movementY,
            })
          );
        }
      }
    },
    [
      activeLayer,
      maskLines,
      getRegionMaskLayerLines,
      sketchLines,
      getControlnetLayerLines,
      setRegionMaskLayerLines,
      setSketchLines,
      setControlnetLayerLines,
      setMaskLines,
      dispatch,
    ]
  );

  const handleMouseUp = useCallback(
    (_e: KonvaEventObject<MouseEvent>) => {
      if (isDrawing.current) {
        // console.log(e);
        isDrawing.current = false;
        // TODO: refactor; DRY
        const linesArr =
          activeLayer === "mask"
            ? maskLines
            : activeLayer.startsWith("regionMask")
              ? getRegionMaskLayerLines()
              : activeLayer === "sketch"
                ? sketchLines
                : getControlnetLayerLines();
        const lastLine = linesArr[linesArr.length - 1];
        // console.log(lastLine.points, lastLine.points.length);

        // Duplicate last point in case a single point was drawn as a line needs
        // at least 2 point to be drawn
        if (lastLine?.points?.length === 2) {
          const [x, y] = lastLine.points;
          // lastLine.points = lastLine.points.concat([x, y]);
          const newLastLine = {
            ...lastLine,
            points: lastLine.points.concat([x, y]),
          };

          // replace last
          // linesArr.splice(linesArr.length - 1, 1, lastLine);
          const newLinesArr = linesArr.slice(0, linesArr.length - 1);
          newLinesArr.push(newLastLine);

          // TODO: refactor; DRY
          if (activeLayer === "mask") {
            setMaskState(newLinesArr, "Add mask", true);
            // dispatch(setStateMaskLines(newLinesArr));
          }

          if (activeLayer.startsWith("regionMask"))
            setRegionMaskLayerLines(newLinesArr, undefined, undefined, true);

          if (activeLayer === "sketch") {
            setSketchState(newLinesArr, "Add sketch", true);
          }
          if (activeLayer.startsWith("controlnet"))
            setControlnetLayerLines(newLinesArr, undefined, undefined, true);
          // layerId?: string,
          // isClear?: boolean,
          // isFinalStroke?: boolean
        } else {
          if (activeLayer === "mask") {
            // dispatch(setStateMaskLines(linesArr));
            setMaskState(linesArr, "Add mask", true);
          }

          if (activeLayer.startsWith("regionMask"))
            setRegionMaskLayerLines(linesArr, undefined, undefined, true);

          if (activeLayer === "sketch") {
            setSketchState(linesArr, "Add sketch", true);
          }
          // if (activeLayer === "sketch") setSketchLines(newLinesArr.concat());
          if (activeLayer.startsWith("controlnet"))
            setControlnetLayerLines(linesArr, undefined, undefined, true);
        }
      }
      // else {
      //   imageLayerRef?.current?.clearCache();
      // }
      // selectionAnchorId.current = "";
    },
    [
      activeLayer,
      maskLines,
      getRegionMaskLayerLines,
      sketchLines,
      getControlnetLayerLines,
      setRegionMaskLayerLines,
      setControlnetLayerLines,
      setMaskState,
      setSketchState,
    ]
  );
  const handleMouseLeave = () => {
    dispatch(setIsbrushPreviewVisible(false));
  };
  const handleMouseEnter = () => {
    dispatch(setIsbrushPreviewVisible(true));
  };
  return (
    <div ref={ref} className="w-full h-full">
      {dimensions && (
        <Stage
          width={dimensions?.width}
          height={dimensions?.height}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onMouseEnter={handleMouseEnter}
          // scale={scale}
          // x={position.x}
          // y={position.y}
          ref={stageRef}
        >
          <ImageLayer />
          <SketchLayer dimensions={dimensions} lines={sketchLines} />
          <ControlnetLayer
            dimensions={dimensions}
            lines={controlnetLines}
            maskLines={controlnetMaskLines}
            tempLines={tempControlnetLines}
            tempMaskLines={tempControlnetMaskLines}
          />
          <MaskLayer
            dimensions={dimensions}
            lines={maskLines}
            regionMaskLines={regionMaskLines}
            tempRegionMaskLines={tempRegionMaskLines}
          />
          <SelectionLayer />
          <OverlayLayer
            dimensions={dimensions}
            brushPreviewRef={brushPreviewRef as Ref<BrushPreviewNode>}
          />
        </Stage>
      )}
      {/* {dimensions && isColorPickerVisible && ( */}
      {dimensions && isColorPickerVisible && (
        <ColorPicker
          isVisible={isColorPickerVisible}
          position={{
            x: (dimensions?.width ?? 0) / 2 - 110,
            y: (dimensions?.height ?? 0) / 2 - 110,
          }}
          onClose={() => dispatch(toggleColorPickerVisibility())}
        />
      )}
      {/* )} */}
    </div>
  );
}
export async function saveImage(
  stageRef: React.RefObject<StageType> | null,
  imageLayerRef,
  selectionBoxRef: React.RefObject<Rect> | null
) {
  const stage = stageRef?.current;
  const selectionBox = selectionBoxRef?.current;

  const stageOriginalScale = stage?.scale();
  stage?.scale({ x: 1, y: 1 });

  const dataUrl = await imageLayerRef?.current?.toDataURL({
    x: selectionBox?.getAbsolutePosition().x,
    y: selectionBox?.getAbsolutePosition().y,
    width: selectionBox?.width(),
    height: selectionBox?.height(),
    // imageSmoothingEnabled: false,
    pixelRatio: 1,
  });
  stage?.scale(stageOriginalScale);
  const link = document.createElement("a");
  link.href = dataUrl ?? "";
  link.download = `image.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
