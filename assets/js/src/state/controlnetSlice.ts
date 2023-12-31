import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Vector2d } from "konva/lib/types";
import ControlnetLayer from "../ControlnetLayer";
import { BrushStroke } from "../MaskLayer-types";
import { RootState } from "../store";
import { selectActiveControlnetId } from "./layersSlice";

type ControlnetResizeMode =
  | "Crop and Resize"
  | "Just Resize"
  | "Scale to Fit (Inner Fit)"
  | "Envelope (Outer Fit)";
type ControlnetModule = "none" | "canny" | "hed" | "depth" | "scribble";
export type ControlnetDetection = {
  module: ControlnetModule;
  processor_res?: number;
  threshold_a?: number;
  threshold_b?: number;
  pixel_perfect?: boolean;
  resize_mode?: ControlnetResizeMode;
};
export type ImageItem = {
  src: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  scale?: number;
};
type ControlnetUi = {
  detectionImage?: string;
  imagePosition: Vector2d;
  imageDimensions: { width: number; height: number };
  overrideBaseLayer: boolean;
  lines: BrushStroke[];
  isVisible: boolean;
  image?: ImageItem | string;
};
export type ControlnetLayer = {
  id?: string;
  model: string;
  weight: number;
  resize_mode: ControlnetResizeMode;
  lowvram?: boolean;
  guidance_start: number;
  guidance_end: number;
  control_mode: number;
  isEnabled: boolean;
  pixel_perfect: boolean;
} & ControlnetDetection &
  Partial<ControlnetUi>;
interface ControlnetState {
  layers: ControlnetLayer[];
}

const controlnetLayerInitialState: ControlnetLayer = {
  model: "",
  module: "none",
  weight: 1,
  resize_mode: "Crop and Resize", //"Just Resize",
  lowvram: false,
  processor_res: 512,
  threshold_a: 0,
  threshold_b: 0,
  // guidance: 1,
  guidance_start: 0,
  guidance_end: 1,
  isEnabled: false,
  overrideBaseLayer: false,
  lines: [],
  isVisible: true,
  pixel_perfect: true,
  control_mode: 0,
};
const initialState: ControlnetState = {
  layers: [
    {
      id: "0",
      ...controlnetLayerInitialState,
    },
    {
      id: "1",
      ...controlnetLayerInitialState,
    },
    {
      id: "2",
      ...controlnetLayerInitialState,
    },
  ],
};
export const controlnetSlice = createSlice({
  name: "controlnet",
  initialState,
  reducers: {
    updateControlnetLayer: (
      state,
      action: PayloadAction<
        { layerId: ControlnetLayer["id"] } & Partial<ControlnetLayer>
      >
    ) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { layerId, resize_mode, ...rest } = action.payload;
      const index = state.layers.findIndex((layer) => layer.id === layerId);
      state.layers[index] = Object.assign(state.layers[index], rest);
    },
    setDetectionImage: (
      state,
      action: PayloadAction<{
        layerId: ControlnetLayer["id"];
        image: string;
        position: Vector2d;
        dimensions: ControlnetUi["imageDimensions"];
      }>
    ) => {
      const { image, position, dimensions, layerId } = action.payload;
      const index = state.layers.findIndex((layer) => layer.id === layerId);
      state.layers[index] = Object.assign(state.layers[index], {
        detectionImage: image,
        imagePosition: position,
        imageDimensions: dimensions,
      });
    },
    // incrementBrushSize: (state) => {
    //   state.brushSize += 5;
    // },
    // decrementBrushSize: (state) => {
    //   state.brushSize -= 5;
    // },
    // updateBrushPreviewPosition: (state, action: PayloadAction<Vector2d>) => {
    //   state.brushPreviewPosition = action.payload;
    // },
    // updateStageScale: (state, action: PayloadAction<number>) => {
    //   state.stageScale = action.payload;
    // },
    // setBrushColor: (state, action: PayloadAction<string>) => {
    //   state.brushColor = action.payload;
    // },
    // toggleColorPickerVisibility: (state) => {
    //   state.isColorPickerVisible = !state.isColorPickerVisible;
    // },
    // setMode: (state, action: PayloadAction<Mode>) => {
    //   state.mode = action.payload;
    // },
    // toggleSketchLayerVisibility: (state) => {
    //   state.isSketchLayerVisible = !state.isSketchLayerVisible;
    // },
    // toggleControlnetLayerVisibility: (state) => {
    //   state.isControlnetLayerVisible = !state.isControlnetLayerVisible;
    // },
    // setMaskColor: (state, action: PayloadAction<string>) => {
    //   state.maskColor = action.payload;
    // },
    // updateSelectionBox: (state, action: PayloadAction<SelectionBox>) => {
    //   state.selectionBox = Object.assign(state.selectionBox, action.payload);
    // },
  },
});

export const { updateControlnetLayer, setDetectionImage } =
  controlnetSlice.actions;

export const selectControlnetLayers = (state: RootState) =>
  state.controlnet.layers;

export const selectControlnetLayer = (state: RootState) => {
  const id = selectActiveControlnetId(state);
  if (id) return state.controlnet.layers[id];
  return null;
};

export const selectControlnetLayerById = (
  state: RootState,
  id: ControlnetLayer["id"]
) => {
  return state.controlnet.layers.findIndex((layer) => layer.id === id);
};

export default controlnetSlice.reducer;
