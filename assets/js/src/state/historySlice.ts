import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { RootState } from "../store";

export type HistoryTopic =
  | "canvas/image"
  | "canvas/mask"
  | "canvas/sketch"
  | "controlnet/image"
  | "canvas/line";

export type HistoryItem = {
  label: string;
  topic: HistoryTopic;
};

interface StatsState {
  past: HistoryItem[];
  future: HistoryItem[];
}

export const initialState: StatsState = {
  past: [],
  future: [],
};
export const historySlice = createSlice({
  name: "history",
  initialState,
  reducers: {
    undo: (state: StatsState) => {
      if (state.past.length) {
        state.future.push(state.past.pop() as HistoryItem);
      }
    },
    redo: (state: StatsState) => {
      if (state.future.length) {
        state.past.push(state.future.pop() as HistoryItem);
      }
    },
    addHistoryItem: (state: StatsState, action: PayloadAction<HistoryItem>) => {
      state.future = [];
      state.past.push(action.payload);
    },
  },
});

export const { undo, redo, addHistoryItem } = historySlice.actions;

export const selectHistory = (state: RootState) => state.history;

export default historySlice.reducer;
