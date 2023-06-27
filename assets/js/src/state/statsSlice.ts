import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../store";

interface StatsState {
  vRamUsage: number;
  ramUsage: number;
  progress: number;
  etaRelative: number;
  isConnected: boolean;
  isGenerating: boolean;
  generatingSessionName: string;
}

export const initialState: StatsState = {
  vRamUsage: 0,
  ramUsage: 0,
  progress: 0,
  etaRelative: 0,
  isConnected: false,
  isGenerating: false,
  generatingSessionName: "",
};
export const statsSlice = createSlice({
  name: "stats",
  initialState,
  reducers: {
    updateStats: (
      state: StatsState,
      action: PayloadAction<
        Partial<StatsState & { cuda_usage: number; ram_usage: number }>
      >
    ) => {
      state.vRamUsage = action.payload.cuda_usage ?? state.vRamUsage;
      state.ramUsage = action.payload.ram_usage ?? state.ramUsage;
      state.progress = action.payload.progress ?? state.progress;
      state.etaRelative = action.payload.etaRelative ?? state.etaRelative;
      state.isGenerating = action.payload.isGenerating ?? state.isGenerating;
      state.generatingSessionName =
        action.payload.generatingSessionName ?? state.generatingSessionName;
    },
    setIsConnected: (state: StatsState, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload;
    },
  },
});

export const { updateStats, setIsConnected } = statsSlice.actions;

export const selectStats = (state: RootState) => state.stats;
export const selectProgress = (state: RootState) => state.stats.progress;
export const selectIsGenerating = (state: RootState) =>
  state.stats.isGenerating;

export const selectIsConnected = (state: RootState) => state.stats.isConnected;

export default statsSlice.reducer;
