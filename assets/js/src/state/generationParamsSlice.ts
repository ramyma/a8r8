import { createSlice } from "@reduxjs/toolkit";
import { RootState } from "../store";

interface GenerationParamsState {
  parameters: string;
}

const initialState: GenerationParamsState = {
  parameters: "",
};
export const generationParamsSlice = createSlice({
  name: "generationParams",
  initialState,
  reducers: {
    setGenerationParams: (state, action) => {
      state.parameters = action.payload;
    },
  },
});

export const { setGenerationParams } = generationParamsSlice.actions;

export const selectGenerationParams = (state: RootState) =>
  state.generationParams.parameters;

export default generationParamsSlice.reducer;
