import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../store";

// interface DataState = {

// }
type DataItem = { data: any; fetched: boolean };
const initialState: Record<string, DataItem> = {};
export const dataSlice = createSlice({
  name: "data",
  initialState,
  reducers: {
    updateData: (
      state,
      action: PayloadAction<{
        key: keyof typeof initialState;
        value: Partial<DataItem>;
      }>
    ) => {
      state[action.payload.key] = {
        ...state[action.payload.key],
        ...action.payload.value,
      };
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
      const itemIndex = (state[dataKey].data as Array<object>).findIndex(
        (dataItem) => dataItem[property] === key
      );
      if (itemIndex !== -1) {
        const dataItem: Record<string, unknown> =
          state[dataKey].data[itemIndex];
        state[dataKey].data[itemIndex] = {
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
