import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Model } from "../App.d";
import { RootState } from "../store";

export type Backend = "auto" | "comfy";
interface OptionsState {
  selectedModel: {
    hash?: Model["sha256"];
    name: string;
    isSdXl: boolean;
  };
  backend: Backend;
}

const initialState: OptionsState = {
  backend: "auto",
  selectedModel: {
    hash: "",
    name: "",
    isSdXl: false,
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
    setBackend: (state, action: PayloadAction<OptionsState["backend"]>) => {
      state.backend = action.payload;
    },
  },
});

export const { setSelectedModel, setBackend } = optionsSlice.actions;

export const selectSelectedModel = (state: RootState) =>
  state.options.selectedModel;

export const selectBackend = (state: RootState) => state.options.backend;

export const selectOptions = (state: RootState) => state.options;

export default optionsSlice.reducer;
