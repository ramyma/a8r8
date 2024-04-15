import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../store";
import { BrushStroke } from "../MaskLayer-types";

interface LinesState {
  controlnetLines: Record<string, BrushStroke[]>;
  controlnetMaskLines: Record<string, BrushStroke[]>;
  regionMaskLines: Record<string, BrushStroke[]>;
}

const initialState: LinesState = {
  controlnetLines: {},
  controlnetMaskLines: {},
  regionMaskLines: {},
};
export const linesSlice = createSlice({
  name: "lines",
  initialState,
  reducers: {
    setControlnetLines: (
      state,
      action: PayloadAction<{ id: string; lines: BrushStroke[] }>
    ) => {
      state.controlnetLines = {
        ...state.controlnetLines,
        [action.payload.id]: action.payload.lines,
      };
    },
    setControlnetMaskLines: (
      state,
      action: PayloadAction<{ id: string; lines: BrushStroke[] }>
    ) => {
      state.controlnetMaskLines = {
        ...state.controlnetMaskLines,
        [action.payload.id]: action.payload.lines,
      };
    },
    setRegionMaskLines: (
      state,
      action: PayloadAction<{ id: string; lines: BrushStroke[] }>
    ) => {
      state.regionMaskLines = {
        ...state.regionMaskLines,
        [action.payload.id]: action.payload.lines,
      };
    },
  },
});

export const {
  setControlnetLines,
  setControlnetMaskLines,
  setRegionMaskLines,
} = linesSlice.actions;

export const selectControlnetLines = (state: RootState) =>
  state.lines.present.controlnetLines;
export const selectControlnetMaskLines = (state: RootState) =>
  state.lines.present.controlnetMaskLines;
export const selectRegionMaskLines = (state: RootState) =>
  state.lines.present.regionMaskLines;
export default linesSlice.reducer;
