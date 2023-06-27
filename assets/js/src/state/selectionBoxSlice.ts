import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../store";

export type Mode = "paint" | "selection";
export type Tool = "brush" | "eraser";

export const DEFAULT_WIDTH_VALUE = 512;
export const DEFAULT_HEIGHT_VALUE = 512;

interface SelectionBox {
  width: number;
  height: number;
  x: number;
  y: number;
}

const initialState: SelectionBox = {
  width: DEFAULT_WIDTH_VALUE,
  height: DEFAULT_HEIGHT_VALUE,
  x: 0,
  y: 0,
};

export const selectionBoxSlice = createSlice({
  name: "selectionBox",
  initialState,
  reducers: {
    updateSelectionBox: (
      state,
      action: PayloadAction<Partial<SelectionBox>>
    ) => {
      state = Object.assign(state, action.payload);
    },
  },
});

export const { updateSelectionBox } = selectionBoxSlice.actions;

export const selectSelectionBox = (state: RootState) => state.selectionBox;

export default selectionBoxSlice.reducer;
