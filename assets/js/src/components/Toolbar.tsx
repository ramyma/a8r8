import { KeyboardEventHandler, useContext, useRef } from "react";
import * as RadixToolbar from "@radix-ui/react-toolbar";
import {
  GroupIcon,
  EraserIcon,
  Pencil2Icon,
  Pencil1Icon,
  CopyIcon,
  ClipboardIcon,
  DownloadIcon,
  ShadowIcon,
} from "@radix-ui/react-icons";
import { RiPaintFill } from "react-icons/ri";

import { useAppDispatch, useAppSelector } from "../hooks";
import {
  selectBrushHardness,
  selectBrushSize,
  selectMode,
  selectStageScale,
  selectTool,
  setBrushHardness,
  setMode,
  setTool,
  toggleColorPickerVisibility,
  updateBrushSize,
} from "../state/canvasSlice";

import useClipboard from "../hooks/useClipboard";
import useHistoryManager from "../hooks/useHistoryManager";
import { isSketchLayer, saveImage } from "../utils";
import RefsContext from "../context/RefsContext";
import { selectActiveLayer } from "../state/layersSlice";
import useBrushColor from "../hooks/useBrushColor";
import Popover from "./Popover";
import Slider, { SliderProps } from "./Slider";
import { emitCustomEvent } from "react-custom-events";
import useGlobalKeydown from "../hooks/useGlobalKeydown";
import { emitUpdateZoomLevel } from "../Canvas/hooks/useCustomEventsListener";

const Toolbar = () => {
  const mode = useAppSelector(selectMode);
  const tool = useAppSelector(selectTool);
  const stageScale = useAppSelector(selectStageScale);
  const brushColor = useBrushColor();
  const activeLayer = useAppSelector(selectActiveLayer);
  const brushHardness = useAppSelector(selectBrushHardness);
  const brushSize = useAppSelector(selectBrushSize);

  const { stageRef, selectionBoxRef } = useContext(RefsContext);

  const brushSettingsRef = useRef<HTMLButtonElement>(null);

  const handleKeydown: KeyboardEventHandler = (event) => {
    if (event.key.toLowerCase() === "b") {
      event.preventDefault();
      brushSettingsRef.current?.click();
    }
  };
  useGlobalKeydown({ handleKeydown });

  const dispatch = useAppDispatch();
  const { undoHistory, redoHistory, hasAvailableUndo, hasAvailableRedo } =
    useHistoryManager();
  const { handleCopyEvent, handlePasteEvent } = useClipboard({});

  const handleModeChange = (value) => {
    dispatch(setMode(value));
  };

  const handleToolChange = (value) => {
    dispatch(setTool(value));
  };

  const handleColorClick = () => {
    dispatch(toggleColorPickerVisibility());
  };

  const handleCopy = (e) => {
    e.preventDefault();
    handleCopyEvent(e, true);
  };

  const handlePaste = (e) => {
    e.preventDefault();
    handlePasteEvent(e, true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    saveImage(stageRef!, selectionBoxRef);
  };

  const handleUndo = (e) => {
    e.preventDefault();
    undoHistory();
  };

  const handleRedo = (e) => {
    e.preventDefault();
    redoHistory();
  };

  const handleFill = (e) => {
    e.preventDefault();
    emitCustomEvent("customFillActiveLayer");
  };

  const handleBrushHardnessChange: SliderProps["onChange"] = (value) => {
    dispatch(setBrushHardness(value));
  };

  const handleBrushSizeChange: SliderProps["onChange"] = (value) => {
    dispatch(updateBrushSize(value));
  };

  const handleZoomLevelChange: SliderProps["onChange"] = (value) => {
    emitUpdateZoomLevel(value);
  };

  const isActiveSketchLayer = isSketchLayer(activeLayer);

  const zoomPercentage = Math.floor(stageScale * 100);

  const toggleItemClasses =
    "shrink-0 grow-0 basis-auto text-white h-[35px] px-[10px] rounded-sm inline-flex text-[13px] leading-none items-center justify-center bg-black/30 ml-0.5 outline-hidden hover:bg-violet3 hover:text-violet11 focus:relative first:ml-0 data-[state=on]:bg-neutral-700/70 data-[state=on]:disabled:bg-neutral-800/70 disabled:text-neutral-500 data-[state=on]:border-primary data-[state=on]:disabled:border-neutral-700 bg-opacity-30";
  return (
    // TODO: create centralized shortcut keys lookup
    <div className="absolute w-full top-0 left-0 select-none z-0 pointer-events-none">
      <RadixToolbar.Root
        className="relative m-auto flex p-2 mt-3 w-fit rounded-sm bg-black/80 border-neutral-900 border shadow-md shadow-black/30 backdrop-blur-xs pointer-events-auto"
        aria-label="Toolbar"
      >
        <RadixToolbar.ToggleGroup
          type="single"
          aria-label="Text formatting"
          value={mode}
          onValueChange={handleModeChange}
        >
          <RadixToolbar.ToggleItem
            className={toggleItemClasses}
            value="selection"
            aria-label="Box"
            title="Box (s)"
          >
            <GroupIcon />
          </RadixToolbar.ToggleItem>
          <RadixToolbar.ToggleItem
            className={toggleItemClasses}
            value="paint"
            aria-label="Paint"
            title="Paint (s)"
          >
            <Pencil2Icon />
          </RadixToolbar.ToggleItem>
        </RadixToolbar.ToggleGroup>
        <RadixToolbar.Separator className="w-[1px] bg-neutral-700 mx-[10px]" />
        <RadixToolbar.Button
          className="w-[35px] h-[35px] mx-[3px] border disabled:border-neutral-700 border-neutral-600 disabled:cursor-not-allowed disabled:text-neutral-500 p-0 basis-auto rounded-sm inline-flex leading-none items-center justify-center outline-hidden disabled:bg-neutral-900! ml-auto"
          style={{
            backgroundColor: brushColor,
          }}
          onClick={handleColorClick}
          aria-label="Color picker"
          title="Color Picker (p)"
          disabled={mode !== "paint"}
        />

        <Popover
          trigger={
            <RadixToolbar.Button
              className="px-[10px] text-white disabled:text-neutral-500 shrink-0 grow-0 basis-auto h-[35px] rounded-sm inline-flex text-[13px] leading-none items-center justify-center outline-hidden  focus:relative "
              style={{ marginLeft: "auto" }}
              aria-label="Brush Settings"
              title="Brush Settings (b)"
              ref={brushSettingsRef}
              disabled={mode !== "paint"}
            >
              <ShadowIcon />
            </RadixToolbar.Button>
          }
        >
          <div className="flex flex-col gap-2">
            <Slider
              label="Hardness"
              // showInput={false}
              min={0}
              max={1}
              value={brushHardness}
              step={0.1}
              onChange={handleBrushHardnessChange}
              disabled={!isActiveSketchLayer}
            />
            <Slider
              label="Size"
              // showInput={false}
              min={10}
              max={500}
              value={brushSize}
              step={2}
              onChange={handleBrushSizeChange}
            />
          </div>
        </Popover>

        <RadixToolbar.ToggleGroup
          type="single"
          aria-label="Text alignment"
          value={tool}
          onValueChange={handleToolChange}
          disabled={mode !== "paint"}
        >
          <RadixToolbar.ToggleItem
            className={toggleItemClasses}
            value="brush"
            aria-label="Brush"
            title="Brush (t)"
          >
            <Pencil1Icon />
          </RadixToolbar.ToggleItem>
          <RadixToolbar.ToggleItem
            className={toggleItemClasses}
            value="eraser"
            aria-label="Eraser"
            title="Eraser (e)"
          >
            <EraserIcon />
          </RadixToolbar.ToggleItem>
        </RadixToolbar.ToggleGroup>
        <RadixToolbar.Button
          className="px-[10px] text-white disabled:text-neutral-500 shrink-0 grow-0 basis-auto h-[35px] rounded-sm inline-flex text-[16px] leading-none items-center justify-center outline-hidden  focus:relative "
          style={{ marginLeft: "auto" }}
          onClick={handleFill}
          aria-label="fill"
          title="Fill (f)"
          disabled={!isActiveSketchLayer}
        >
          <RiPaintFill />
        </RadixToolbar.Button>
        <RadixToolbar.Separator className="w-[1px] bg-neutral-700 mx-[10px]" />
        <RadixToolbar.Button
          className="px-[10px] text-white disabled:text-neutral-500 shrink-0 grow-0 basis-auto h-[35px] rounded-sm inline-flex text-[13px] leading-none items-center justify-center outline-hidden  focus:relative "
          style={{ marginLeft: "auto" }}
          onClick={handleUndo}
          aria-label="Undo"
          title="Undo (ctrl+z)"
          disabled={!hasAvailableUndo}
        >
          Undo
        </RadixToolbar.Button>
        <RadixToolbar.Button
          className="px-[10px] text-white disabled:text-neutral-500 shrink-0 grow-0 basis-auto h-[35px] rounded-sm inline-flex text-[13px] leading-none items-center justify-center outline-hidden  focus:relative "
          style={{ marginLeft: "auto" }}
          onClick={handleRedo}
          aria-label="Redo"
          title="Redo (ctrl+shift+z/ctrl+y)"
          disabled={!hasAvailableRedo}
        >
          Redo
        </RadixToolbar.Button>
        <RadixToolbar.Button
          className="px-[10px] text-white shrink-0 grow-0 basis-auto h-[35px] rounded-sm inline-flex text-[13px] leading-none items-center justify-center outline-hidden hover:bg-violet10 focus:relative"
          style={{ marginLeft: "auto" }}
          onClick={handleCopy}
          aria-label="Copy"
          title="Copy (ctrl+c)"
        >
          <CopyIcon />
        </RadixToolbar.Button>
        <RadixToolbar.Button
          className="px-[10px] text-white shrink-0 grow-0 basis-auto h-[35px] rounded-sm inline-flex text-[13px] leading-none items-center justify-center outline-hidden hover:bg-violet10 focus:relative"
          style={{ marginLeft: "auto" }}
          onClick={handlePaste}
          aria-label="Paste"
          title="Paste (ctrl+v)"
        >
          <ClipboardIcon />
        </RadixToolbar.Button>

        <RadixToolbar.Button
          className="px-[10px] text-white shrink-0 grow-0 basis-auto h-[35px] rounded-sm inline-flex text-[13px] leading-none items-center justify-center outline-hidden hover:bg-violet10 focus:relative"
          style={{ marginLeft: "auto" }}
          onClick={handleSave}
          aria-label="Save"
          title="Save (ctrl+s)"
        >
          <DownloadIcon />
        </RadixToolbar.Button>
        <RadixToolbar.Separator className="w-[1px] bg-neutral-700 mx-[10px]" />

        <Popover
          trigger={
            <RadixToolbar.Button
              className="text-white shrink-0 grow-0 basis-auto h-[35px] rounded-sm inline-flex text-[13px] leading-none items-center justify-center outline-hidden hover:bg-violet10 focus:relative"
              style={{ marginLeft: "auto" }}
              aria-label="Save"
              title="Save (ctrl+s)"
            >
              <span
                className="px-[10px] w-14 text-white shrink-0 grow-0 basis-auto h-full inline-flex text-[13px] leading-none items-center justify-center outline-hidden hover:bg-violet10 focus:relative select-none"
                title="Zoom (-/+/1)"
              >
                {zoomPercentage}%
              </span>
            </RadixToolbar.Button>
          }
          contentClassName="min-w-[180px]"
        >
          <Slider
            label="Zoom"
            value={zoomPercentage}
            onChange={handleZoomLevelChange}
            min={10}
            max={1000}
            step={1}
            defaultValue={100}
          />
        </Popover>
      </RadixToolbar.Root>
    </div>
  );
};

export default Toolbar;
