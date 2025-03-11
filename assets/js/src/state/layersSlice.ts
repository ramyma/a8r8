import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../store";
import { extractSketchLayerId, isSketchLayer } from "../utils";

export type SketchLayerId = `sketch${string}`;

export type ActiveLayer =
  | "base"
  | "mask"
  | "sketch"
  | SketchLayerId
  | `regionMask${string}`
  | `controlnet${string}`
  | `controlnet${string}-mask`; // | string;

export type SketchLayer = {
  id: string;
  linesImage?: string;
  isVisible: boolean;
  name: string;
  image?: {
    imageDataUrl: string;
    x: number;
    y: number;
  };
};

interface LayersState {
  activeLayer: ActiveLayer;
  isSketchLayerVisible: boolean;
  isSketchLayerEnabled: boolean;
  isMaskLayerVisible: boolean;
  isMaskLayerEnabled: boolean;
  layers: SketchLayer[];
  generationLayer: SketchLayerId;
}

const initialState: LayersState = {
  activeLayer: "sketchbase",
  isSketchLayerVisible: true,
  isSketchLayerEnabled: true,
  isMaskLayerVisible: true,
  isMaskLayerEnabled: true,
  layers: [{ id: "base", isVisible: true, name: "Base" }],
  generationLayer: "sketchbase",
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
    toggleLayerVisibility: (state, action: PayloadAction<string>) => {
      const idx = state.layers.findIndex(({ id }) => id === action.payload);
      state.layers[idx].isVisible = !state.layers[idx].isVisible;
    },
    decrementLayerOrder: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      const index = state.layers.findIndex((layer) => layer.id === id);
      if (index > 0) {
        state.layers = [
          ...state.layers.slice(0, index - 1),
          state.layers[index],
          state.layers[index - 1],
          ...state.layers.slice(index + 1, state.layers.length),
        ];
      }
    },
    incrementLayerOrder: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      const index = state.layers.findIndex((layer) => layer.id === id);
      if (index < state.layers.length - 1) {
        state.layers = [
          ...state.layers.slice(0, index),
          state.layers[index + 1],
          state.layers[index],
          ...state.layers.slice(index + 2, state.layers.length),
        ];
      }
    },
    addSketchLayer: (state, action: PayloadAction<string>) => {
      const newLayer = {
        id: action.payload,
        isVisible: true,
        name: `Sketch ${state.layers.length + 1}`,
      };

      if (isSketchLayer(state.activeLayer)) {
        const index = state.layers.findIndex(
          (layer) => layer.id === extractSketchLayerId(state.activeLayer)
        );
        state.layers = [
          ...state.layers.slice(0, index),
          newLayer,
          ...state.layers.slice(index),
        ];
      } else {
        state.layers = [...state.layers, newLayer];
      }
    },
    removeSketchLayer: (state, action: PayloadAction<string>) => {
      state.layers = state.layers.filter(({ id }) => id !== action.payload);
      if (
        isSketchLayer(state.generationLayer) &&
        extractSketchLayerId(state.generationLayer) === action.payload &&
        state.layers.length > 0
      ) {
        state.generationLayer = `sketch${state.layers[0].id}`;
      }
    },
    setGenerationLayer: (state, action: PayloadAction<SketchLayerId>) => {
      state.generationLayer = action.payload;
    },
    setLayerName: (
      state,
      action: PayloadAction<{ id: string; name: string }>
    ) => {
      const { id, name } = action.payload;
      const index = state.layers.findIndex((layer) => layer.id === id);
      if (index > -1 && index < state.layers.length) {
        state.layers[index] = { ...state.layers[index], name };
      }
    },
    setLayerImageParams: (
      state,
      action: PayloadAction<{ id: string; image: SketchLayer["image"] }>
    ) => {
      const { id, image } = action.payload;
      const index = state.layers.findIndex((layer) => layer.id === id);
      if (index > -1 && index < state.layers.length) {
        state.layers[index] = { ...state.layers[index], image };
      }
    },
  },
});

export const {
  setActiveLayer,
  toggleSketchLayerVisibility,
  toggleSketchLayerIsEnabled,
  toggleMaskLayerVisibility,
  toggleMaskLayerIsEnabled,
  decrementLayerOrder,
  incrementLayerOrder,
  toggleLayerVisibility,
  addSketchLayer,
  removeSketchLayer,
  setGenerationLayer,
  setLayerName,
  setLayerImageParams,
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

export const selectActivePromptRegionId = (
  state: RootState
): string | undefined => {
  if (state.layers.activeLayer.startsWith("regionMask"))
    return state.layers.activeLayer.replace("regionMask", "");
};

export const selectLayers = (state: RootState): SketchLayer[] =>
  state.layers.layers;
export const selectLayersCount = (state: RootState) => {
  return state.layers.layers.length;
};

export const selectGenerationLayer = (state: RootState): SketchLayerId =>
  state.layers.generationLayer;

export default layersSlice.reducer;
