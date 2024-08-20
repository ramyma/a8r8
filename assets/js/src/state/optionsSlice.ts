import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Model } from "../App.d";
import { RootState } from "../store";

export type Backend = "auto" | "comfy";
export type OptionsState = {
  selectedModel: {
    hash?: Model["sha256"];
    name: string;
    isSdXl?: boolean;
    isFlux?: boolean;
  };
  sd_vae?: string;
  clipModel?: string;
  clipModel2?: string;
  backend: Backend;
};

const initialState: OptionsState = {
  backend: "auto",
  selectedModel: {
    hash: "",
    name: "",
    isSdXl: false,
    isFlux: false,
  },
};
export const optionsSlice = createSlice({
  name: "options",
  initialState,
  reducers: {
    setSelectedModel: (
      state,
      action: PayloadAction<OptionsState["selectedModel"]>
    ) => {
      state.selectedModel = action.payload;
    },
    setSelectedVae: (state, action: PayloadAction<OptionsState["sd_vae"]>) => {
      state.sd_vae = action.payload;
    },
    setSelectedClipModel: (
      state,
      action: PayloadAction<OptionsState["clipModel"]>
    ) => {
      state.clipModel = action.payload;
    },
    setSelectedClipModel2: (
      state,
      action: PayloadAction<OptionsState["clipModel"]>
    ) => {
      state.clipModel2 = action.payload;
    },
    setBackend: (state, action: PayloadAction<OptionsState["backend"]>) => {
      state.backend = action.payload;
    },
  },
});

export const {
  setSelectedModel,
  setSelectedClipModel2,
  setSelectedVae,
  setSelectedClipModel,
  setBackend,
} = optionsSlice.actions;

export const selectSelectedModel = (state: RootState) =>
  state.options.selectedModel;

export const selectSelectedVae = (state: RootState) => state.options.sd_vae;

export const selectSelectedClipModel = (state: RootState) =>
  state.options.clipModel;

export const selectSelectedClipModel2 = (state: RootState) =>
  state.options.clipModel2;

export const selectBackend = (state: RootState) => state.options.backend;

export const selectOptions = (state: RootState) => state.options;

export default optionsSlice.reducer;
