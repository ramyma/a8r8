import React, { useCallback } from "react";
import { HexAlphaColorPicker } from "react-colorful";
import useEyeDropper from "use-eye-dropper";
import { useAppDispatch, useAppSelector } from "./hooks";
import {
  selectBrushColor,
  selectMaskColor,
  setBrushColor,
  setMaskColor,
  toggleColorPickerVisibility,
} from "./state/canvasSlice";
import { selectActiveLayer } from "./state/layersSlice";
import useGlobalKeydown from "./hooks/useGlobalKeydown";

const rgbaToHex = (rgba) => {
  const [r, g, b] = rgba.slice(5, -1).split(",").map(Number);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

const ColorPicker = () => {
  const dispatch = useAppDispatch();
  const activeLayer = useAppSelector(selectActiveLayer);

  const maskColor = useAppSelector(selectMaskColor);
  const brushColor = useAppSelector(selectBrushColor);

  const { open, close, isSupported } = useEyeDropper();
  const color = activeLayer === "mask" ? maskColor : brushColor;

  const handleColorChange = (color: string) => {
    if (activeLayer === "mask") dispatch(setMaskColor(color));
    if (activeLayer === "sketch" || activeLayer.startsWith("controlnet"))
      dispatch(setBrushColor(color));
  };
  const handleKeydown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        dispatch(toggleColorPickerVisibility());
      }
    },
    [dispatch]
  );

  useGlobalKeydown({ handleKeydown });

  const pickColor = async () => {
    const color = await open();
    console.log(color);
    handleColorChange(rgbaToHex(color.sRGBHex));
  };
  return (
    <div className="flex flex-col">
      <HexAlphaColorPicker color={color} onChange={handleColorChange} />
      {isSupported() && (
        <button className="bg-black" onClick={pickColor}>
          pick
        </button>
      )}
    </div>
  );
};

export default ColorPicker;
