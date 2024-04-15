import {
  KeyboardEventHandler,
  MouseEventHandler,
  useCallback,
  useRef,
} from "react";
import { HexAlphaColorPicker, HexColorPicker } from "react-colorful";
import useEyeDropper from "use-eye-dropper";
import { BiSolidEyedropper } from "react-icons/bi";
import { useDrag } from "@use-gesture/react";
import { useSpring, animated, config } from "@react-spring/web";
import { Cross2Icon } from "@radix-ui/react-icons";
import { useAppDispatch, useAppSelector } from "./hooks";
import {
  selectIsColorPickerPosition,
  setBrushColor,
  setMaskColor,
  toggleColorPickerVisibility,
} from "./state/canvasSlice";
import { selectActiveLayer } from "./state/layersSlice";
import useGlobalKeydown from "./hooks/useGlobalKeydown";
import useBrushColor from "./hooks/useBrushColor";
import { updateControlnetLayer } from "./state/controlnetSlice";
import { updatePromptRegionLayer } from "./state/promptRegionsSlice";

const rgbaToHex = (rgba) => {
  const [r, g, b] = rgba.slice(5, -1).split(",").map(Number);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

export type ColorPickerProps = {
  onColorChange?: (color: string) => void;
  onClose?: () => void;
  position: { x: number; y: number };
  color?: string;
  isVisible?: boolean;
  pickerType?: "hexOnly" | "hexAndAlpha";
};

const ColorPicker = ({
  position,
  color,
  // isVisible,
  onColorChange,
  onClose,
  pickerType = "hexAndAlpha",
}: ColorPickerProps) => {
  const colorPickerPosition = useAppSelector(selectIsColorPickerPosition);
  const containerRef = useRef<HTMLDivElement>(null);
  const posX = position?.x ?? colorPickerPosition?.x;
  const posY = position?.y ?? colorPickerPosition?.y;
  const [style, api] = useSpring(() => ({
    x: 0,
    y: 0,
    left: posX,
    top: posY,
    config: config.stiff,
    touchAction: "none",
    // opacity: isVisible ? 1 : 0,
  }));
  const bind = useDrag(({ offset: [x, y], target, cancel }) => {
    if (containerRef.current === target) {
      api.start({ x, y });
    } else {
      cancel();
    }
  });

  const dispatch = useAppDispatch();
  const activeLayer = useAppSelector(selectActiveLayer);

  const brushColor = useBrushColor();

  const { open, close, isSupported } = useEyeDropper();
  const processedColor = color ?? brushColor;

  const handleColorChange = (color: string) => {
    if (onColorChange) onColorChange(color);
    else {
      if (activeLayer === "mask") dispatch(setMaskColor(color));
      else if (
        activeLayer === "sketch" ||
        (activeLayer.startsWith("controlnet") && !activeLayer.includes("mask"))
      )
        dispatch(setBrushColor(color));
      else if (
        activeLayer.startsWith("controlnet") &&
        activeLayer.includes("mask")
      ) {
        dispatch(
          updateControlnetLayer({
            layerId: activeLayer.replace(/(controlnet|-mask)/gi, ""),
            maskColor: color,
          })
        );
      } else if (activeLayer.startsWith("regionMask")) {
        dispatch(
          updatePromptRegionLayer({
            layerId: activeLayer.replace("regionMask", ""),
            maskColor: color,
          })
        );
      }
    }
  };
  const handleKeydown: KeyboardEventHandler = useCallback(
    (e) => {
      if (
        e.key === "Escape" ||
        (e.key.toLowerCase() === "p" && !e.shiftKey && !e.altKey && !e.ctrlKey)
      ) {
        if (onClose) onClose();
        else dispatch(toggleColorPickerVisibility());
      }
    },
    [dispatch, onClose]
  );

  useGlobalKeydown({ handleKeydown, override: true });

  const pickColor: MouseEventHandler = async (event) => {
    event.preventDefault();
    try {
      const color = await open();

      handleColorChange(rgbaToHex(color.sRGBHex));
    } catch (e) {
      close();
    }
  };

  const ColorPickerComponent =
    pickerType === "hexAndAlpha" ? HexAlphaColorPicker : HexColorPicker;

  return (
    <animated.div
      ref={containerRef}
      className="block group absolute z-10 shadow-lg shadow-black/50 border border-neutral-800/40 rounded-md bg-black/60 backdrop-blur-md p-7 cursor-move"
      // style={{ left: posX, top: posY }}
      style={style}
      {...bind()}
    >
      <div
        onClick={() => onClose?.()}
        className="opacity-0 pointer-events-none group-hover:opacity-100 hover:opacity-100 group-hover:pointer-events-auto absolute top-[-19px] end-[-19px] cursor-pointer select-none rounded-full bg-black/80 hover:bg-neutral-800/70 backdrop-blur-md size-10 transition-all duration-300 flex justify-center items-center"
      >
        <Cross2Icon />
      </div>
      <div className="flex flex-col">
        <ColorPickerComponent
          color={processedColor}
          onChange={handleColorChange}
          onKeyDown={handleKeydown}
        />
        {isSupported() && (
          <button
            className="border-neutral-700/60 bg-neutral-900/60 flex justify-center rounded-md rounded-t-none"
            onClick={pickColor}
            onKeyDown={handleKeydown}
          >
            <BiSolidEyedropper />
          </button>
        )}
      </div>
    </animated.div>
  );
};

export default ColorPicker;
