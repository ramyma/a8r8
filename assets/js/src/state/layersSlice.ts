import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../store";

export type ActiveLayer =
  | "base"
  | "mask"
  | "sketch"
  | `controlnet${string}`
  | `controlnet${string}-mask`; // | string;

interface LayersState {
  activeLayer: ActiveLayer;
  isSketchLayerVisible: boolean;
  isSketchLayerEnabled: boolean;
  isMaskLayerVisible: boolean;
  isMaskLayerEnabled: boolean;
}

const initialState: LayersState = {
  activeLayer: "base",
  isSketchLayerVisible: true,
  isSketchLayerEnabled: true,
  isMaskLayerVisible: true,
  isMaskLayerEnabled: true,
};
export const layersSlice = createSlice({
  name: "layers",
  initialState,
  reducers: {
    setActiveLayer: (state, action: PayloadAction<ActiveLayer>) => {
      state.activeLayer = action.payload;
    },
    toggleSketchLayerVisibility: (state) => {
      state.isSketchLayerVisible = !state.isSketchLayerVisible;
    },
    toggleSketchLayerIsEnabled: (state) => {
      state.isSketchLayerEnabled = !state.isSketchLayerEnabled;
    },
    toggleMaskLayerVisibility: (state) => {
      state.isMaskLayerVisible = !state.isMaskLayerVisible;
    },
    toggleMaskLayerIsEnabled: (state) => {
      state.isMaskLayerEnabled = !state.isMaskLayerEnabled;
    },
  },
});

export const {
  setActiveLayer,
  toggleSketchLayerVisibility,
  toggleSketchLayerIsEnabled,
  toggleMaskLayerVisibility,
  toggleMaskLayerIsEnabled,
} = layersSlice.actions;

export const selectActiveLayer = (state: RootState) => state.layers.activeLayer;
export const selectIsSketchLayerVisible = (state: RootState) =>
  state.layers.isSketchLayerVisible;
export const selectIsSketchLayerEnabled = (state: RootState) =>
  state.layers.isSketchLayerEnabled;
export const selectIsMaskLayerVisible = (state: RootState) =>
  state.layers.isMaskLayerVisible;
export const selectIsMaskLayerEnabled = (state: RootState) =>
  state.layers.isMaskLayerEnabled;
export const selectActiveControlnetId = (
  state: RootState
): string | undefined => {
  if (state.layers.activeLayer.startsWith("controlnet"))
    return state.layers.activeLayer
      .replace("controlnet", "")
      .replace("-mask", "");
};

export default layersSlice.reducer;
