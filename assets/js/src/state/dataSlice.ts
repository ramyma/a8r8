import { createSlice } from "@reduxjs/toolkit";
import { RootState } from "../store";

// interface DataState = {

// }

const initialState = {};
export const dataSlice = createSlice({
  name: "data",
  initialState,
  reducers: {
    updateData: (state, action) => {
      Object.assign(state, action.payload);
    },
  },
});

export const { updateData } = dataSlice.actions;

export const selectData = (state: RootState) => state.data;

export default dataSlice.reducer;
