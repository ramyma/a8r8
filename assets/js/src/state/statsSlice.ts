import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../store";

interface StatsState {
  vRamUsage: number;
  ramUsage: number;
  progress: number;
  etaRelative: number;
  isSocketConnected: boolean;
  isBackendConnected: boolean;
  isGenerating: boolean;
  generatingSessionName: string;
}

export const initialState: StatsState = {
  vRamUsage: 0,
  ramUsage: 0,
  progress: 0,
  etaRelative: 0,
  isSocketConnected: false,
  isBackendConnected: false,
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
    setIsBackendConnected: (
      state: StatsState,
      action: PayloadAction<boolean>
    ) => {
      state.isBackendConnected = action.payload;
    },
    setIsSocketConnected: (
      state: StatsState,
      action: PayloadAction<boolean>
    ) => {
      state.isSocketConnected = action.payload;
    },
  },
});

export const { updateStats, setIsSocketConnected, setIsBackendConnected } =
  statsSlice.actions;

export const selectStats = (state: RootState) => state.stats;
export const selectProgress = (state: RootState) => state.stats.progress;
export const selectIsGenerating = (state: RootState) =>
  state.stats.isGenerating;
export const selectIsBackendConnected = (state: RootState) =>
  state.stats.isBackendConnected;
export const selectIsSocketConnected = (state: RootState) =>
  state.stats.isSocketConnected;
export const selectIsConnected = (state: RootState) =>
  state.stats.isSocketConnected && state.stats.isBackendConnected;

export default statsSlice.reducer;
