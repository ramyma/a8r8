import { createSlice, PayloadAction } from "@reduxjs/toolkit";
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
    updateDataItemByProperty: (
      state,
      action: PayloadAction<{
        dataKey: string;
        property: string;
        key: string;
        value: object;
      }>
    ) => {
      const { dataKey, property, key, value } = action.payload;
      const itemIndex = (state[dataKey] as Array<object>).findIndex(
        (dataItem) => dataItem[property] === key
      );
      if (itemIndex !== -1) {
        const dataItem: Record<string, unknown> = state[dataKey][itemIndex];
        state[dataKey][itemIndex] = {
          ...dataItem,
          ...value,
        };
      }
    },
  },
});

export const { updateData, updateDataItemByProperty } = dataSlice.actions;

export const selectData = (state: RootState) => state.data;

export default dataSlice.reducer;
