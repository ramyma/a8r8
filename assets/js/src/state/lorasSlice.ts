import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../store";
import { Lora } from "../App.d";

// interface DataState = {

// }
type LoraUI = { isEnabled: boolean; strength: number; triggerWords?: string[] };
export type LoraState = LoraUI & { path: string };

const initialState: {
  loras: LoraState[];
  showNsfwLoras: boolean;
  showNsfwLoraImages: boolean;
} = { loras: [], showNsfwLoras: false, showNsfwLoraImages: true };
export const lorasSlice = createSlice({
  name: "loras",
  initialState,
  reducers: {
    addLora: (state, action: PayloadAction<Lora["path"]>) => {
      state.loras = [
        ...state.loras,
        { path: action.payload, strength: 1, isEnabled: true },
      ];
    },
    updateLora: (
      state,
      action: PayloadAction<{ index: number; lora: Partial<LoraState> }>
    ) => {
      state.loras[action.payload.index] = {
        ...state.loras[action.payload.index],
        ...action.payload.lora,
      };
    },
    removeLora: (state, action: PayloadAction<number>) => {
      state.loras = state.loras.filter((_, index) => index !== action.payload);
    },
    toggleNsfwLoras: (state) => {
      state.showNsfwLoras = !state.showNsfwLoras;
    },
    toggleNsfwLoraImages: (state) => {
      state.showNsfwLoraImages = !state.showNsfwLoraImages;
    },
  },
});

export const { addLora, updateLora, removeLora, toggleNsfwLoras } =
  lorasSlice.actions;

export const selectLoras = (state: RootState) => state.loras.loras;
export const selectShowNsfwLoras = (state: RootState) =>
  state.loras.showNsfwLoras;
export const selectShowNsfwLoraImages = (state: RootState) =>
  state.loras.showNsfwLoraImages;

export default lorasSlice.reducer;
