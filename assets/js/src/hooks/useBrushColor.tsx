import { useAppSelector } from "../hooks";
import { selectActiveLayer } from "../state/layersSlice";
import { selectBrushColor, selectMaskColor } from "../state/canvasSlice";
import { selectControlnetLayerById } from "../state/controlnetSlice";
import { selectPromptRegionLayerById } from "../state/promptRegionsSlice";
import { isSketchLayer } from "../utils";

const useBrushColor = (): string => {
  const activeLayer = useAppSelector(selectActiveLayer);
  const maskColor = useAppSelector(selectMaskColor);
  const brushColor = useAppSelector(selectBrushColor);
  const controlnetLayer = useAppSelector((state) =>
    selectControlnetLayerById(
      state,
      activeLayer.replace(/(controlnet|-mask)/gi, "")
    )
  );
  const regionMaskLayer = useAppSelector((state) =>
    selectPromptRegionLayerById(state, activeLayer.replace("regionMask", ""))
  );

  if (activeLayer === "mask") return maskColor;
  if (
    isSketchLayer(activeLayer) ||
    (activeLayer.startsWith("controlnet") && !activeLayer.includes("mask"))
  )
    return brushColor;
  if (activeLayer.startsWith("controlnet") && activeLayer.includes("mask"))
    return controlnetLayer?.maskColor ?? "";
  if (activeLayer.startsWith("regionMask"))
    return regionMaskLayer?.maskColor ?? "";

  return "#000000";
};

export default useBrushColor;
