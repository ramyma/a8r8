import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Model, ModelType } from "../App.d";
import { RootState } from "../store";

export type Backend = "auto" | "comfy" | "forge";
export type OptionsState = {
  selectedModel: {
    hash?: Model["sha256"];
    name: string;
    isSdXl?: boolean;
    isFlux?: boolean;
    isPony?: boolean;
    isSd35?: boolean;
    modelType?: ModelType;
  };
  sd_vae?: string;
  clipModel?: string;
  clipModel2?: string;
  clipModels?: string[];
  backend: Backend;
};

const initialState: OptionsState = {
  backend: "auto",
  selectedModel: {
    hash: "",
    name: "",
    isSdXl: false,
    isFlux: false,
    isPony: false,
    isSd35: false,
  },
  clipModels: [],
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
    setSelectedClipModels: (
      state,
      action: PayloadAction<OptionsState["clipModels"]>
    ) => {
      state.clipModels = action.payload;
    },
    setBackend: (state, action: PayloadAction<OptionsState["backend"]>) => {
      state.backend = action.payload;
    },
  },
});

export const {
  setSelectedModel,
  setSelectedClipModel2,
  setSelectedClipModels,
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

export const selectSelectedClipModels = (state: RootState) =>
  state.options.clipModels;

export const selectBackend = (state: RootState) => state.options.backend;

export const selectOptions = (state: RootState) => state.options;

export default optionsSlice.reducer;
