import {
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
  Tool,
  selectBrushHardness,
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

import {
  debugImage,
  extractSketchLayerId,
  hexToRgba,
  isSketchLayer,
  roundToClosestMultipleOf8,
  saveImage,
  scalePoint,
} from "../utils";
import useGlobalKeydown from "../hooks/useGlobalKeydown";
import {
  DEFAULT_HEIGHT_VALUE,
  DEFAULT_WIDTH_VALUE,
  updateSelectionBox,
} from "../state/selectionBoxSlice";
import useHistoryState from "../hooks/useHistoryState";
import useSocket from "../hooks/useSocket";
import useCustomEventsListener from "./hooks/useCustomEventsListener";
import { CanvasDimensions } from "./Canvas.d";
import { addHistoryItem } from "../state/historySlice";
import useLines from "./hooks/useLines";
import Konva from "konva";
import useLayerState from "../hooks/useLayerState";

const SCALE_BY = 1.1;
const MIN_SCALE = 0.11;

let lastX = 0;
let lastY = 0;

export default function Canvas() {
  const { broadcastSelectionBoxUpdate } = useSocket();
  const {
    stageRef,
    selectionBoxRef,
    canvasContainerRef: ref,
  } = useContext(RefsContext);
  const [dimensions, setDimensions] = useState<CanvasDimensions>();
  const [, setScale] = useState<Vector2d>({ x: 1.0, y: 1.0 });
  const {
    setHistoryStateItem: setMaskState,
    clearHistoryStateItem: clearMaskLines,
    state: maskLines,
    setState: setMaskLines,
  } = useHistoryState<BrushStroke>({ topic: "canvas/mask" });

  const {
    addLayerImage,
    setLayerImage,
    clearLayer: clearSketchLayer,
  } = useLayerState({
    stageRef: stageRef,
  });

  const dispatch = useAppDispatch();

  const tempLines = useRef<BrushStroke[]>([]);
  const setTempLines = (input) => {
    if (typeof input == "function") {
      tempLines.current = input(tempLines.current);
    } else {
      tempLines.current = input;
    }
  };

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
  const brushHardness = useAppSelector(selectBrushHardness);

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
      if (isSketchLayer(layer)) {
        const extractedLayerId = extractSketchLayerId(layer);
        if (extractedLayerId) {
          clearSketchLayer(extractedLayerId);
        }
      }
      if (layer.startsWith("controlnet")) {
        // const layerId = layer.replace("controlnet", "");
        setControlnetLayerLines([], layer, true, true);
      }
    },
    [
      activeLayer,
      maskLines.length,
      clearMaskLines,
      setRegionMaskLayerLines,
      clearSketchLayer,
      setControlnetLayerLines,
    ]
  );

  const fillActiveLayer = useCallback(() => {
    const layer = stageRef?.current?.getChildren(
      (child) =>
        child instanceof Konva.Layer &&
        child.attrs.id === extractSketchLayerId(activeLayer)
    )?.[0];
    if (layer) {
      fill({
        layer,
        setLayerImage,
        color: brushColor,
        dimensions: selectionBoxRef!.current!.getSize(),
        position: selectionBoxRef!.current!.getPosition(),
      });
    }
  }, [activeLayer, brushColor, selectionBoxRef, setLayerImage, stageRef]);

  const zoomCanvas = useCallback(
    ({
      stage,
      direction = 1,
      zoomPercentage,
      scaleOrigin = "pointer",
    }: {
      stage: StageType;
      direction?: number;
      zoomPercentage?: number;
      scaleOrigin?: "pointer" | "canvasCenter";
    }) => {
      if ((stage?.scaleX() ?? 1) > MIN_SCALE || direction > 0) {
        const oldScale = stage?.scale() ?? { x: 1, y: 1 };
        const stagePosition = stage?.getPosition() ?? { x: 0, y: 0 };

        const scaleComponent = zoomPercentage
          ? zoomPercentage / 100
          : Math.min(
              10,
              direction > 0 ? oldScale.x * SCALE_BY : oldScale.x / SCALE_BY
            );
        const newScale = { x: scaleComponent, y: scaleComponent };

        dispatch(updateStageScale(newScale.x));

        stage?.scale(newScale);

        const oldPos = stage.getPosition();

        setScale(newScale);

        let newPos: Vector2d = { x: 0, y: 0 };

        if (scaleOrigin === "pointer") {
          const pointer = stage?.getPointerPosition() ?? { x: 0, y: 0 };
          const mousePointTo = scalePoint(pointer, oldScale, stagePosition);
          newPos = {
            x: pointer.x - mousePointTo.x * newScale.x,
            y: pointer.y - mousePointTo.y * newScale.y,
          };
        } else {
          const stageCenterX = stage.width() / 2;
          const stageCenterY = stage.height() / 2;
          newPos = {
            x: oldPos.x + stageCenterX * (oldScale.x - newScale.x),
            y: oldPos.y + stageCenterY * (oldScale.y - newScale.y),
          };
        }

        stage?.position(newPos);
      }
    },
    [dispatch]
  );

  const updateZoom = (zoomPercentage: number) => {
    if (stageRef?.current)
      zoomCanvas({
        stage: stageRef.current,
        zoomPercentage,
        scaleOrigin: "canvasCenter",
      });
  };

  useCustomEventsListener({ clearLines, fillActiveLayer, updateZoom });

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
    if (stage) {
      zoomCanvas({ stage, direction });
    }
  };

  const handleKeydown = useCallback(
    async (e: KeyboardEvent) => {
      if (e.key === "1") {
        const stage = stageRef?.current as Konva.Stage;

        zoomCanvas({ stage, zoomPercentage: 100, scaleOrigin: "canvasCenter" });
      }
      if (e.key === "+") {
        const stage = stageRef?.current;
        const direction = 1;

        if (stage)
          zoomCanvas({ stage, direction, scaleOrigin: "canvasCenter" });
      }
      if (e.key === "-") {
        const stage = stageRef?.current;
        const direction = -1;

        if (stage)
          zoomCanvas({ stage, direction, scaleOrigin: "canvasCenter" });
      }
      if (e.key === "[") {
        if (brushSize > 10) dispatch(decrementBrushSize(e.ctrlKey ? 0.2 : 2));
      }
      if (e.key === "{") {
        if (brushSize > 10) dispatch(decrementBrushSize(10));
      }
      if (e.key === "]") {
        dispatch(incrementBrushSize(e.ctrlKey ? 0.2 : 2));
      }
      if (e.key === "}") {
        dispatch(incrementBrushSize(10));
      }
      if (e.key.toLocaleLowerCase() === "c" && !e.ctrlKey) {
        clearLines();
      }
      if (e.key.toLocaleLowerCase() === "f") {
        const layer = stageRef?.current?.getChildren(
          (child) =>
            child instanceof Konva.Layer &&
            child.attrs.id === extractSketchLayerId(activeLayer)
        )?.[0];
        if (layer) {
          fill({
            layer,
            setLayerImage,
            color: brushColor,
            dimensions: selectionBoxRef!.current!.getSize(),
            position: selectionBoxRef!.current!.getPosition(),
          });
        }
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
        await saveImage(stageRef!, selectionBoxRef);
      } else if (e.key.toLocaleLowerCase() === "s") {
        if (mode === "selection") dispatch(setMode("paint"));
        else dispatch(setMode("selection"));
      }

      if (e.key.toLocaleLowerCase() === "m") {
        if (activeLayer === "mask") {
          // dispatch(setActiveLayer("sketch"));
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
      activeLayer,
      setLayerImage,
      brushColor,
      selectionBoxRef,
      tool,
      mode,
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
              : isSketchLayer(activeLayer)
                ? setTempLines
                : setControlnetLayerLines;

        if (isSketchLayer(activeLayer)) {
          const pos: Vector2d = scalePoint(
            stage?.getPointerPosition() ?? { x: 0, y: 0 },
            stage?.scale() ?? { x: 1, y: 1 },
            stage?.position() ?? { x: 0, y: 0 }
          );
          lastX = pos.x;
          lastY = pos.y;

          const layer = stageRef?.current?.getChildren(
            (child) =>
              child instanceof Konva.Layer &&
              child.attrs.id === extractSketchLayerId(activeLayer)
          )?.[0];

          const linesGroup = layer?.getChildren(
            (item) => item instanceof Konva.Group && item.attrs.id == "lines"
          )[0] as Konva.Group;

          drawStamp({
            parent: linesGroup,
            x: lastX,
            y: lastY,
            brushSize,
            brushHardness,
            brushColor,
            tool,
          });
        } else {
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
        // }
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
      setControlnetLayerLines,
      stageRef,
      brushSize,
      brushHardness,
      brushColor,
      tool,
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
                : isSketchLayer(activeLayer)
                  ? tempLines.current
                  : getControlnetLayerLines();

          const lastLine = linesArr?.[linesArr.length - 1];
          // add point
          // lastLine.points = lastLine.points.concat([point.x, point.y]);
          const newLastLine = lastLine?.points && {
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

          if (isSketchLayer(activeLayer)) {
            const layer = stageRef?.current?.getChildren(
              (child) =>
                child instanceof Konva.Layer &&
                child.attrs.id === extractSketchLayerId(activeLayer)
            )?.[0];

            const linesGroup = layer?.getChildren(
              (item) => item instanceof Konva.Group && item.attrs.id == "lines"
            )[0] as Konva.Group;

            const spacing = 10;

            const dx = point.x - lastX;
            const dy = point.y - lastY;
            const dist = Math.hypot(dx, dy);

            if (dist === 0) return;

            const steps = Math.floor(dist / spacing);
            const dirX = dx / dist;
            const dirY = dy / dist;

            for (let i = 1; i <= steps; i++) {
              const currentX = lastX + dirX * i * spacing;
              const currentY = lastY + dirY * i * spacing;
              drawStamp({
                x: currentX,
                y: currentY,
                parent: linesGroup,
                brushColor,
                brushHardness,
                brushSize,
                tool,
              });
            }

            lastX += dirX * steps * spacing;
            lastY += dirY * steps * spacing;
          }

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
      getControlnetLayerLines,
      setRegionMaskLayerLines,
      setControlnetLayerLines,
      setMaskLines,
      stageRef,
      brushColor,
      brushHardness,
      brushSize,
      tool,
      dispatch,
    ]
  );

  const handleMouseUp = useCallback(
    async (_e: KonvaEventObject<MouseEvent>) => {
      if (isDrawing.current) {
        // console.log(e);
        isDrawing.current = false;
        // TODO: refactor; DRY
        const linesArr =
          activeLayer === "mask"
            ? maskLines
            : activeLayer.startsWith("regionMask")
              ? getRegionMaskLayerLines()
              : isSketchLayer(activeLayer)
                ? tempLines.current
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
        }
        if (isSketchLayer(activeLayer)) {
          const layer = stageRef?.current?.getChildren(
            (child) =>
              child instanceof Konva.Layer &&
              child.attrs.id === extractSketchLayerId(activeLayer)
          )?.[0] as Konva.Layer;
          // drawLines({ layer, lines: linesArr });

          // setSketchLines(newLinesArr.concat());
          // clearSketchLines("Clear sketch");
          // const oldStageScale = stageRef?.current?.scale();

          const linesGroup = layer?.getChildren(
            (item) => item instanceof Konva.Group && item.attrs.id == "lines"
          )[0] as Konva.Group;

          const strokes = linesGroup.children as Konva.Line[];

          let minX = Infinity;
          let minY = Infinity;
          let maxX = -Infinity;
          let maxY = -Infinity;
          strokes.forEach((stroke) => {
            if (stroke.globalCompositeOperation() !== "source-over") return;
            const { x, y } = {
              x: stroke.attrs.x,
              y: stroke.attrs.y,
            };
            if (x - brushSize / 2 < minX) minX = x - brushSize / 2;
            if (x + brushSize / 2 > maxX) maxX = x + brushSize / 2;
            if (y - brushSize / 2 < minY) minY = y - brushSize / 2;
            if (y + brushSize / 2 > maxY) maxY = y + brushSize / 2;
          });

          const stagePos = stageRef!.current!.position();

          const clonedLayer = layer?.clone({
            position: stagePos,
            // scale: { x: 1, y: 1 },
          });
          const imageGroup = clonedLayer?.children?.find(
            (item) => item.attrs.id == "sketch-image"
          ) as Konva.Group | undefined;

          const img = imageGroup?.children.find(
            (item) => item instanceof Konva.Image
          );
          minX = Math.min(minX, img?.x() ?? Infinity);
          maxX = Math.max(maxX, img ? img?.x() + img?.width() : -Infinity);
          minY = Math.min(minY, img?.y() ?? Infinity);
          maxY = Math.max(maxY, img ? img?.y() + img?.height() : -Infinity);

          // if (minX % 1 || maxX % 1 || minY % 1 || maxY % 1)
          //   console.warn(
          //     "Decimal position, will cause location shifts on update!"
          //   );
          clonedLayer?.visible(true);
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

          // stageRef?.current?.scale(oldStageScale);
          debugImage(layerDataUrl, "test");

          // const imageObj = new Image();
          // imageObj.onload = function () {
          //   // const image = new Konva.Image({
          //   //   x: minX,
          //   //   y: minY,
          //   //   image: imageObj,
          //   //   // width: maxX - minX,
          //   //   // height: maxY - minY,
          //   // });
          //   // imageGroup.destroyChildren();
          //   // imageGroup.add(image);
          //   // sketchLayerRef?.current.clearCache();
          // };
          // imageObj.src = maskDataUrl;

          await setLayerImage({
            dataUrl: layerDataUrl,
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
            layerId: extractSketchLayerId(activeLayer),
          });

          setTempLines([]);
          clonedLayer?.destroy();
          clearLayerTempLines({ layer });
        }

        if (activeLayer.startsWith("controlnet"))
          setControlnetLayerLines(linesArr, undefined, undefined, true);
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
      getControlnetLayerLines,
      setControlnetLayerLines,
      setRegionMaskLayerLines,
      setMaskState,
      stageRef,
      setLayerImage,
      brushSize,
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
          <SketchLayer addLayerImage={addLayerImage} />

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

const fill = async ({
  layer,
  setLayerImage,
  color,
  dimensions,
  position,
}: {
  layer: Konva.Layer;
  setLayerImage: ReturnType<typeof useLayerState>["setLayerImage"];
  color: string;
  dimensions: CanvasDimensions;
  position: Vector2d;
}) => {
  const rect = new Konva.Rect({
    fill: color || "#df4b26",
    x: position.x,
    y: position.y,
    width: dimensions.width,
    height: dimensions.height,
  });
  layer.add(rect);

  let minX = position.x;
  let minY = position.y;
  let maxX = position.x + dimensions.width;
  let maxY = position.y + dimensions.height;

  const stagePos = layer.getStage().position();

  const clonedLayer = layer.clone({
    position: stagePos,
    // scale: { x: 1, y: 1 },
  });

  const imageGroup = layer?.children.find(
    (item) => item.attrs.id == "sketch-image"
  ) as Konva.Group;

  const img = imageGroup.children.find((item) => item instanceof Konva.Image);

  minX = Math.min(minX, img?.x() ?? Infinity);
  maxX = Math.max(maxX, img ? img?.x() + img?.width() : -Infinity);
  minY = Math.min(minY, img?.y() ?? Infinity);
  maxY = Math.max(maxY, img ? img?.y() + img?.height() : -Infinity);

  if (minX % 1 || maxX % 1 || minY % 1 || maxY % 1)
    console.warn("Decimal position, will cause location shifts on update!");
  clonedLayer.visible(true);
  clonedLayer.cache({ imageSmoothingEnabled: false });

  const maskDataUrl =
    (await clonedLayer.toDataURL({
      x: minX + stagePos.x, //stagContainer.clientWidth / 2 - 512 / 2,
      y: minY + stagePos.y,
      width: maxX - minX,
      height: maxY - minY,
      imageSmoothingEnabled: false,
      // pixelRatio: 1 / stageRef?.current.scaleX(),
    })) ?? "";
  // stageRef?.current?.scale(oldStageScale);

  debugImage(maskDataUrl, "test");

  const imageObj = new Image();
  imageObj.onload = function () {};
  imageObj.src = maskDataUrl;
  await setLayerImage({
    layerId: layer.attrs.id,
    dataUrl: maskDataUrl,
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  });
  clonedLayer?.destroy();
  rect.destroy();
};

const clearLayerTempLines = ({ layer }: { layer: Konva.Layer }) => {
  const linesGroup = layer?.getChildren(
    (item) => item instanceof Konva.Group && item.attrs.id == "lines"
  )[0] as Konva.Group;
  if (linesGroup) {
    linesGroup.clearCache();
    linesGroup.destroyChildren();
  }
};

function drawStamp({
  parent,
  x,
  y,
  brushSize,
  brushColor,
  brushHardness,
  tool,
}: {
  parent: Konva.Layer | Konva.Group;
  x: number;
  y: number;
  brushSize: number;
  brushColor: string;
  brushHardness: number;
  tool: Tool;
}) {
  parent.add(
    new Konva.Circle({
      x: Math.floor(x),
      y: Math.floor(y),
      width: brushSize,
      height: brushSize,
      globalCompositeOperation:
        tool === "eraser" ? "destination-out" : "source-over",
      fillRadialGradientStartRadius: 0,
      fillRadialGradientEndRadius: brushSize / 2,
      fillRadialGradientColorStops: [
        0,
        hexToRgba(brushColor),
        brushHardness,
        hexToRgba(brushColor),
        1,
        hexToRgba(brushColor, 0),
      ],
    })
  );
}
