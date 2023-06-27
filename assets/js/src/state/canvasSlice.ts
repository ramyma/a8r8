import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Vector2d } from "konva/lib/types";
import { RootState } from "../store";
import { BrushStroke } from "../MaskLayer-types";
import { theme } from "../context/ThemeContext";

export type Mode = "paint" | "selection";
export type Tool = "brush" | "eraser";

interface CanvasState {
  brushColor: string;
  brushSize: number;
  maskColor: string;
  invertMask: boolean;
  brushPreviewPosition: Vector2d;
  isBrushPreviewVisible: boolean;
  stageScale: number;
  stagePosition: Vector2d;
  isColorPickerVisible: boolean;
  mode: Mode;
  tool: Tool;
  isControlnetLayerVisible: boolean;
  maskLines: BrushStroke[];
}

const initialState: CanvasState = {
  brushColor: theme.colors.primary,
  maskColor: theme.colors.primary,
  brushSize: 40,
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
};
export const canvasSlice = createSlice({
  name: "canvas",
  initialState,
  reducers: {
    updateBrushSize: (state, action) => {
      state.brushSize = action.payload;
    },
    incrementBrushSize: (state) => {
      state.brushSize += 5;
    },
    decrementBrushSize: (state) => {
      state.brushSize -= 5;
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
    setIsbrushPreviewVisible: (state, action: PayloadAction<boolean>) => {
      state.isBrushPreviewVisible = action.payload;
    },
    toggleColorPickerVisibility: (state) => {
      state.isColorPickerVisible = !state.isColorPickerVisible;
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
  setIsbrushPreviewVisible,
  toggleColorPickerVisibility,
  setMode,
  setTool,
  toggleControlnetLayerVisibility,
  setMaskColor,
  setMaskLines,
  toggleInvertMask,
} = canvasSlice.actions;

export const selectBrushColor = (state: RootState) => state.canvas.brushColor;
export const selectBrushSize = (state: RootState) => state.canvas.brushSize;
export const selectIsBrushPreviewVisible = (state: RootState) =>
  state.canvas.isBrushPreviewVisible;
export const selectIsColorPickerVisible = (state: RootState) =>
  state.canvas.isColorPickerVisible;
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

export default canvasSlice.reducer;
