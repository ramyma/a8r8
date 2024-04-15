import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../store";

export type PromptRegionLayer = {
  id?: string;
  mode: PromptRegionState["mode"];
  maskColor?: string;
  weight: number;
  prompt: string;
  name: string;
  isVisible: boolean;
  isEnabled: boolean;
};
interface PromptRegionState {
  isRegionalPromptsEnabled: boolean;
  mode: "mask" | "box" | "basic";
  layers: PromptRegionLayer[];
  previewLayerId?: PromptRegionLayer["id"];
}

const promptRegionLayerInitialState: Omit<PromptRegionLayer, "id"> = {
  weight: 1,
  isVisible: true,
  isEnabled: false,
  maskColor: "#FFFFFF",
  mode: "mask",
  name: "",
  prompt: "",
};
const initialState: PromptRegionState = {
  isRegionalPromptsEnabled: false,
  mode: "mask",
  layers: [
    {
      id: "0",
      ...promptRegionLayerInitialState,
    },
    {
      id: "1",
      ...promptRegionLayerInitialState,
    },
  ],
};
export const promptRegionsSlice = createSlice({
  name: "promptRegion",
  initialState,
  reducers: {
    updatePromptRegionLayer: (
      state,
      action: PayloadAction<
        { layerId: PromptRegionLayer["id"] } & Partial<PromptRegionLayer>
      >
    ) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { layerId, ...rest } = action.payload;
      const index = state.layers.findIndex((layer) => layer.id === layerId);
      if (index !== -1)
        state.layers[index] = Object.assign(state.layers[index], rest);
    },

    addPromptRegionLayer: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      state.layers[state.layers.length] = {
        id,
        ...promptRegionLayerInitialState,
      };
    },
    removePromptRegionLayer: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      state.layers = state.layers.filter((layer) => layer.id !== id);
    },
    decrementOrder: (state, action: PayloadAction<string>) => {
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
    incrementOrder: (state, action: PayloadAction<string>) => {
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
    setPreviewLayerId: (state, action: PayloadAction<string | undefined>) => {
      state.previewLayerId = action.payload;
    },
    setIsRegionalPromptEnabled: (state, action: PayloadAction<boolean>) => {
      state.isRegionalPromptsEnabled = action.payload;
    },
  },
});

export const {
  updatePromptRegionLayer,
  addPromptRegionLayer,
  removePromptRegionLayer,
  decrementOrder,
  incrementOrder,
  setPreviewLayerId,
  setIsRegionalPromptEnabled,
} = promptRegionsSlice.actions;

export const selectPromptRegionLayers = (state: RootState) =>
  state.promptRegions.layers;

export const selectPromptRegionLayerIndexById = (
  state: RootState,
  id: PromptRegionLayer["id"]
) => {
  return state.promptRegions.layers.findIndex((layer) => layer.id === id);
};

export const selectPromptRegionLayerById = (
  state: RootState,
  id: PromptRegionLayer["id"]
) => {
  return state.promptRegions.layers.find((layer) => layer.id === id);
};
export const selectPromptRegionPreviewLayerId = (state: RootState) => {
  return state.promptRegions.previewLayerId;
};
export const selectPromptRegionLayersCount = (state: RootState) => {
  return state.promptRegions.layers.length;
};
export const selectIsRegionalPromptsEnabled = (state: RootState) =>
  state.promptRegions.isRegionalPromptsEnabled;
export default promptRegionsSlice.reducer;
