import React, { RefObject } from "react";
import { Stage as StageType } from "konva/lib/Stage";
import { createContext } from "react";
import { Node as NodeType } from "konva/lib/Node";
import { Rect as RectType } from "konva/lib/shapes/Rect";
import { Layer as LayerType } from "konva/lib/Layer";

const RefsContext = createContext<{
  selectionBoxRef: RefObject<RectType> | null;
  selectionBoxLayerRef: RefObject<LayerType> | null;
  maskLayerRef: RefObject<LayerType> | null;
  imageLayerRef: RefObject<LayerType> | null;
  stageRef: RefObject<StageType> | null;
  maskCompositeRectRef: RefObject<NodeType> | null;
  sketchLayerRef: RefObject<LayerType> | null;
  overlayLayerRef: RefObject<LayerType> | null;
  controlnetLayerRef: RefObject<LayerType> | null;
}>({
  controlnetLayerRef: null,
  imageLayerRef: null,
  maskCompositeRectRef: null,
  maskLayerRef: null,
  overlayLayerRef: null,
  selectionBoxLayerRef: null,
  selectionBoxRef: null,
  sketchLayerRef: null,
  stageRef: null,
});

export default RefsContext;
