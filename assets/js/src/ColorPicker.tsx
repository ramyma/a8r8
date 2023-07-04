import React, { KeyboardEvent, useCallback } from "react";
import { HexAlphaColorPicker } from "react-colorful";
import useEyeDropper from "use-eye-dropper";
import { BiSolidEyedropper } from "react-icons/bi";
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
    (e) => {
      if (e.key === "Escape") {
        dispatch(toggleColorPickerVisibility());
      }
    },
    [dispatch]
  );

  useGlobalKeydown({ handleKeydown });

  const pickColor = async () => {
    try {
      const color = await open();

      handleColorChange(rgbaToHex(color.sRGBHex));
    } catch (e) {
      close();
    }
  };
  return (
    <div className="flex flex-col rounded p-4 bg-black/50 backdrop-blur-md border-neutral-900 border">
      <HexAlphaColorPicker
        color={color}
        onChange={handleColorChange}
        onKeyDown={handleKeydown}
      />
      {isSupported() && (
        <button
          className="border-neutral-700 bg-neutral-900 flex justify-center rounded rounded-t-none"
          onClick={pickColor}
          onKeyDown={handleKeydown}
        >
          <BiSolidEyedropper />
        </button>
      )}
    </div>
  );
};

export default ColorPicker;
