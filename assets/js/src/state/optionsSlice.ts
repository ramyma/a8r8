import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Model } from "../App.d";
import { RootState } from "../store";

interface OptionsState {
  selectedModel: Model["sha256"];
}

const initialState: OptionsState = {
  selectedModel: "",
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
  },
});

export const { setSelectedModel } = optionsSlice.actions;

export const selectSelectedModel = (state: RootState) =>
  state.options.selectedModel;

export const selectOptions = (state: RootState) => state.options;

export default optionsSlice.reducer;
