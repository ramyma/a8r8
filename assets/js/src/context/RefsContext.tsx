import { RefObject } from "react";
import { Stage as StageType } from "konva/lib/Stage";
import { createContext } from "react";
import { Node as NodeType } from "konva/lib/Node";
import { Rect as RectType } from "konva/lib/shapes/Rect";
import { Layer as LayerType } from "konva/lib/Layer";
import { Group as GroupType } from "konva/lib/Group";
import { Image as ImageType } from "konva/lib/shapes/Image";

export type RefsContextProps = {
  canvasContainerRef: RefObject<HTMLDivElement> | null;
  selectionBoxRef: RefObject<RectType> | null;
  selectionBoxLayerRef: RefObject<LayerType> | null;
  maskGroupRef: RefObject<GroupType> | null;
  regionMasksGroupRef: RefObject<GroupType> | null;
  imageLayerRef: RefObject<LayerType> | null;
  stageRef: RefObject<StageType> | null;
  maskCompositeRectRef: RefObject<NodeType> | null;
  sketchLayerRef: RefObject<LayerType> | null;
  overlayLayerRef: RefObject<LayerType> | null;
  controlnetLayerRef: RefObject<LayerType> | null;
  batchResultPreviewImageRef: RefObject<ImageType> | null;
};
const RefsContext = createContext<RefsContextProps>({
  canvasContainerRef: null,
  controlnetLayerRef: null,
  imageLayerRef: null,
  maskCompositeRectRef: null,
  maskGroupRef: null,
  regionMasksGroupRef: null,
  overlayLayerRef: null,
  selectionBoxLayerRef: null,
  selectionBoxRef: null,
  sketchLayerRef: null,
  stageRef: null,
  batchResultPreviewImageRef: null,
});

export default RefsContext;
