import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Vector2d } from "konva/lib/types";
import { RootState } from "../store";
import { BrushStroke } from "../MaskLayer-types";

export type Mode = "paint" | "selection";
export type Tool = "brush" | "eraser";

interface CanvasState {
  brushColor: string;
  brushSize: number;
  brushHardness: number;
  maskColor: string;
  invertMask: boolean;
  brushPreviewPosition: Vector2d;
  isBrushPreviewVisible: boolean;
  stageScale: number;
  stagePosition: Vector2d;
  isColorPickerVisible: boolean;
  colorPickerPosition: Vector2d;
  mode: Mode;
  tool: Tool;
  isControlnetLayerVisible: boolean;
  maskLines: BrushStroke[];
  batchImageResults: string[];
  activeBatchImageResultIndex?: number;
  batchPreviewIsVisible?: boolean;
  batchImageResultsLayer?: string;
}
const styles = getComputedStyle(document.documentElement);

const initialState: CanvasState = {
  brushColor: "#000", //theme.colors.black,
  brushHardness: 1,
  maskColor: styles.getPropertyValue("--color-primary"), //theme.colors.primary,
  brushSize: 100,
  brushPreviewPosition: { x: -100, y: -100 },
  isBrushPreviewVisible: true,
  stageScale: 1.0,
  stagePosition: { x: 0, y: 0 },
  isColorPickerVisible: false,
  mode: "paint",
  tool: "brush",
  isControlnetLayerVisible: true,
  maskLines: [],
  invertMask: false,
  colorPickerPosition: { x: -100, y: -100 },
  batchImageResults: [],
};
export const canvasSlice = createSlice({
  name: "canvas",
  initialState,
  reducers: {
    updateBrushSize: (state, action) => {
      state.brushSize = action.payload;
    },
    incrementBrushSize: (state, action: PayloadAction<number | undefined>) => {
      state.brushSize += 10 * (action.payload ?? 1);
    },
    decrementBrushSize: (state, action: PayloadAction<number | undefined>) => {
      state.brushSize = Math.max(
        5,
        state.brushSize - 10 * (action.payload ?? 1)
      );
    },
    updateBrushPreviewPosition: (state, action: PayloadAction<Vector2d>) => {
      state.brushPreviewPosition = action.payload;
    },
    updateStageScale: (state, action: PayloadAction<number>) => {
      state.stageScale = action.payload;
    },
    updateStagePosition: (state, action: PayloadAction<Vector2d>) => {
      state.stagePosition = action.payload;
    },
    setBrushColor: (state, action: PayloadAction<string>) => {
      state.brushColor = action.payload;
    },
    setBrushHardness: (state, action: PayloadAction<number>) => {
      state.brushHardness = action.payload;
    },

    setIsbrushPreviewVisible: (state, action: PayloadAction<boolean>) => {
      state.isBrushPreviewVisible = action.payload;
    },
    toggleColorPickerVisibility: (
      state,
      action: PayloadAction<Vector2d | undefined>
    ) => {
      state.isColorPickerVisible = !state.isColorPickerVisible;
      if (action.payload) state.colorPickerPosition = action.payload;
    },
    setMode: (state, action: PayloadAction<Mode>) => {
      state.mode = action.payload;
    },
    setTool: (state, action: PayloadAction<Tool>) => {
      state.tool = action.payload;
    },
    toggleControlnetLayerVisibility: (state) => {
      state.isControlnetLayerVisible = !state.isControlnetLayerVisible;
    },
    setMaskColor: (state, action: PayloadAction<string>) => {
      state.maskColor = action.payload;
    },
    setMaskLines: (state, action: PayloadAction<BrushStroke[]>) => {
      state.maskLines = action.payload;
    },
    toggleInvertMask: (state) => {
      state.invertMask = !state.invertMask;
    },
    setBatchImageResults: (
      state,
      action: PayloadAction<
        | {
            images: CanvasState["batchImageResults"];
            layer?: string;
          }
        | undefined
      >
    ) => {
      const { images = [], layer } = action.payload ?? {};
      state.batchImageResults = images;
      state.activeBatchImageResultIndex = 0;
      state.batchPreviewIsVisible = true;
      state.batchImageResultsLayer = layer;
    },
    setActiveBatchImageResultIndex: (state, action: PayloadAction<number>) => {
      state.activeBatchImageResultIndex = action.payload;
    },
    setBatchPreviewIsVisible: (state, action: PayloadAction<boolean>) => {
      state.batchPreviewIsVisible = action.payload;
    },
  },
});

export const {
  updateBrushSize,
  incrementBrushSize,
  decrementBrushSize,
  updateBrushPreviewPosition,
  updateStageScale,
  updateStagePosition,
  setBrushColor,
  setBrushHardness,
  setIsbrushPreviewVisible,
  toggleColorPickerVisibility,
  setMode,
  setTool,
  toggleControlnetLayerVisibility,
  setMaskColor,
  setMaskLines,
  toggleInvertMask,
  setBatchImageResults,
  setActiveBatchImageResultIndex,
  setBatchPreviewIsVisible,
} = canvasSlice.actions;

export const selectBrushColor = (state: RootState) => state.canvas.brushColor;
export const selectBrushSize = (state: RootState) => state.canvas.brushSize;
export const selectBrushHardness = (state: RootState) =>
  state.canvas.brushHardness;
export const selectIsBrushPreviewVisible = (state: RootState) =>
  state.canvas.isBrushPreviewVisible;
export const selectIsColorPickerVisible = (state: RootState) =>
  state.canvas.isColorPickerVisible;
export const selectIsColorPickerPosition = (state: RootState) =>
  state.canvas.colorPickerPosition;
export const selectStageScale = (state: RootState) => state.canvas.stageScale;
export const selectStagePosition = (state: RootState) =>
  state.canvas.stagePosition;
export const selectMode = (state: RootState) => state.canvas.mode;
export const selectTool = (state: RootState) => state.canvas.tool;

export const selectIsControlnetLayerVisible = (state: RootState) =>
  state.canvas.isControlnetLayerVisible;
export const selectMaskColor = (state: RootState) => state.canvas.maskColor;
export const selectMaskLines = (state: RootState) => state.canvas.maskLines;
export const selectInvertMask = (state: RootState) => state.canvas.invertMask;
export const selectBatchImageResults = (state: RootState) =>
  state.canvas.batchImageResults;
export const selectActiveBatchImageResultIndex = (state: RootState) =>
  state.canvas.activeBatchImageResultIndex;
export const selectBatchPreviewIsVisible = (state: RootState) =>
  state.canvas.batchPreviewIsVisible;
export const selectBatchImageResultsLayer = (state: RootState) =>
  state.canvas.batchImageResultsLayer;
export default canvasSlice.reducer;
