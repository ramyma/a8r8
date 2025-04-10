import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Vector2d } from "konva/lib/types";
import ControlnetLayer from "../ControlnetLayer";
import { BrushStroke } from "../MaskLayer-types";
import { RootState } from "../store";
import { selectActiveControlnetId } from "./layersSlice";
import { weightTypesByName } from "../MainForm/constants";

export const CONTROL_MODES = [
  "Balanced",
  "My prompt is more important",
  "ControlNet is more important",
] as const;

type ControlnetResizeMode =
  | "Crop and Resize"
  | "Just Resize"
  | "Scale to Fit (Inner Fit)"
  | "Envelope (Outer Fit)";
type ControlnetModule = "None" | "canny" | "hed" | "depth" | "scribble";
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
export type InstantIdKeypointMode = "sameAsImage" | "useVisible" | "override";
type ControlnetUi = {
  detectionImage?: string;
  imagePosition: Vector2d;
  imageDimensions: { width: number; height: number };
  overrideVisible: boolean;
  overrideVisibleForInstantIdKeypoints?: boolean;
  keypointsMode: InstantIdKeypointMode;
  lines: BrushStroke[];
  maskLines: BrushStroke[];
  isVisible: boolean;
  isMaskVisible: boolean;
  isMaskEnabled: boolean;
  image?: ImageItem | string | null;
  image_kps?: ImageItem | string | null;
  mask_image?: string | null;
  maskColor?: string;
  weight_type?: keyof typeof weightTypesByName;
  composition_weight?: number;
  isIpAdapter: boolean;
  isInstantId: boolean;
  is_union: boolean;
  iPAdapterModel?: string;
  iPAdapterWeightType?: string;
  union_type?: string;
};
export type ControlnetLayer = {
  id?: string;
  model: string;
  weight: number;
  instant_id_ip_weight?: number;
  instant_id_noise?: number;
  resize_mode: ControlnetResizeMode;
  low_vram?: boolean;
  guidance_start: number;
  guidance_end: number;
  control_mode: (typeof CONTROL_MODES)[number];
  isEnabled: boolean;
  pixel_perfect: boolean;
  advanced_weighting?: number[];
} & ControlnetDetection &
  Partial<ControlnetUi>;
interface ControlnetState {
  layers: ControlnetLayer[];
}

const controlnetLayerInitialState: ControlnetLayer = {
  model: "",
  module: "None",
  weight: 1,
  resize_mode: "Crop and Resize", //"Just Resize",
  low_vram: false,
  processor_res: 512,
  threshold_a: 0,
  threshold_b: 0,
  // guidance: 1,
  guidance_start: 0,
  guidance_end: 1,
  isEnabled: false,
  overrideVisible: false,
  lines: [],
  maskLines: [],
  isVisible: true,
  isMaskVisible: true,
  isMaskEnabled: false,
  pixel_perfect: true,
  control_mode: "Balanced",
  maskColor: "#FFFFFF",
  isIpAdapter: false,
  isInstantId: false,
  is_union: false,
  union_type: "auto",
};
const initialState: ControlnetState = {
  layers: [
    {
      id: "0",
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
      if (index !== -1)
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
    addControlnetLayer: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      state.layers[state.layers.length] = {
        id,
        ...controlnetLayerInitialState,
      };
    },
    addInstantIdLayer: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      state.layers[state.layers.length] = {
        id,
        ...controlnetLayerInitialState,
        isInstantId: true,
        keypointsMode: "sameAsImage",
        instant_id_ip_weight: 0.8,
        weight: 0.8,
      };
    },
    addIpAdapterLayer: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      state.layers[state.layers.length] = {
        id,
        ...controlnetLayerInitialState,
        isIpAdapter: true,
      };
    },
    removeControlnetLayer: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      state.layers = state.layers.filter((layer) => layer.id !== id);
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

export const {
  updateControlnetLayer,
  setDetectionImage,
  addControlnetLayer,
  addInstantIdLayer,
  addIpAdapterLayer,
  removeControlnetLayer,
} = controlnetSlice.actions;

export const selectControlnetLayers = (state: RootState) =>
  state.controlnet.layers;

export const selectControlnetLayer = (state: RootState) => {
  const id = selectActiveControlnetId(state);
  if (id) return state.controlnet.layers[id];
  return null;
};

export const selectControlnetLayerIndexById = (
  state: RootState,
  id: ControlnetLayer["id"]
) => {
  return state.controlnet.layers.findIndex((layer) => layer.id === id);
};

export const selectControlnetLayerById = (
  state: RootState,
  id: ControlnetLayer["id"]
) => {
  return state.controlnet.layers.find((layer) => layer.id === id);
};

export const selectActiveInstantIdLayersCount = (state: RootState) =>
  state.controlnet.layers.reduce(
    (acc, layer) => (layer.isInstantId && layer.isEnabled ? acc + 1 : acc),
    0
  );

export default controlnetSlice.reducer;
