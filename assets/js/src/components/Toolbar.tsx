import React from "react";
import * as RadixToolbar from "@radix-ui/react-toolbar";
import {
  GroupIcon,
  EraserIcon,
  Pencil2Icon,
  Pencil1Icon,
  CopyIcon,
  ClipboardIcon,
} from "@radix-ui/react-icons";
import { useAppDispatch, useAppSelector } from "../hooks";
import {
  selectMode,
  selectStageScale,
  selectTool,
  setMode,
  setTool,
} from "../state/canvasSlice";

import useClipboard from "../hooks/useClipboard";
import useHistoryManager from "../hooks/useHistoryManager";

const Toolbar = () => {
  const mode = useAppSelector(selectMode);
  const tool = useAppSelector(selectTool);

  const stageScale = useAppSelector(selectStageScale);

  const dispatch = useAppDispatch();
  const { undoHistory, redoHistory, hasAvailableUndo, hasAvailableRedo } =
    useHistoryManager();
  const { handleCopyEvent, handlePasteEvent } = useClipboard({});

  const handleModeChange = (value) => {
    value && dispatch(setMode(value));
  };

  const handleToolChange = (value) => {
    value && dispatch(setTool(value));
  };

  const handleCopy = (e) => {
    e.preventDefault();
    handleCopyEvent(e, true);
  };

  const handlePaste = (e) => {
    e.preventDefault();
    handlePasteEvent(e, true);
  };

  const handleUndo = (e) => {
    e.preventDefault();
    undoHistory();
  };

  const handleRedo = (e) => {
    e.preventDefault();
    redoHistory();
  };

  const toggleItemClasses =
    "flex-shrink-0 flex-grow-0 basis-auto text-white h-[35px] px-[10px] rounded inline-flex text-[13px] leading-none items-center justify-center bg-black ml-0.5 outline-none hover:bg-violet3 hover:text-violet11 focus:relative focus:shadow-[0_0_0_2px] focus:shadow-violet7 first:ml-0 data-[state=on]:bg-neutral-700/70 data-[state=on]:disabled:bg-neutral-800/70 disabled:text-neutral-500 data-[state=on]:border-primary data-[state=on]:disabled:border-neutral-700 bg-opacity-30";
  return (
    // TODO: create centralized shortcut keys lookup
    <div className="absolute w-full top-0 left-0 select-none z-0 pointer-events-none">
      <RadixToolbar.Root
        className="relative m-auto flex p-2 mt-3 w-fit rounded bg-black/80 border-neutral-900 border shadow-md shadow-black/30 backdrop-blur-sm pointer-events-auto"
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
        <RadixToolbar.ToggleGroup
          type="single"
          aria-label="Text alignment"
          value={tool}
          onValueChange={handleToolChange}
          disabled={mode === "selection"}
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
        <RadixToolbar.Separator className="w-[1px] bg-neutral-700 mx-[10px]" />
        <RadixToolbar.Button
          className="px-[10px] text-white disabled:text-neutral-500 flex-shrink-0 flex-grow-0 basis-auto h-[35px] rounded inline-flex text-[13px] leading-none items-center justify-center outline-none  focus:relative "
          style={{ marginLeft: "auto" }}
          onClick={handleUndo}
          aria-label="Undo"
          title="Undo (ctrl+z)"
          disabled={!hasAvailableUndo}
        >
          Undo
        </RadixToolbar.Button>
        <RadixToolbar.Button
          className="px-[10px] text-white disabled:text-neutral-500 flex-shrink-0 flex-grow-0 basis-auto h-[35px] rounded inline-flex text-[13px] leading-none items-center justify-center outline-none  focus:relative "
          style={{ marginLeft: "auto" }}
          onClick={handleRedo}
          aria-label="Redo"
          title="Redo (ctrl+shift+z/ctrl+y)"
          disabled={!hasAvailableRedo}
        >
          Redo
        </RadixToolbar.Button>
        <RadixToolbar.Button
          className="px-[10px] text-white flex-shrink-0 flex-grow-0 basis-auto h-[35px] rounded inline-flex text-[13px] leading-none items-center justify-center outline-none hover:bg-violet10 focus:relative focus:shadow-[0_0_0_2px] focus:shadow-violet7"
          style={{ marginLeft: "auto" }}
          onClick={handleCopy}
          aria-label="Copy"
          title="Copy (ctrl+c)"
        >
          <CopyIcon />
        </RadixToolbar.Button>
        <RadixToolbar.Button
          className="px-[10px] text-white flex-shrink-0 flex-grow-0 basis-auto h-[35px] rounded inline-flex text-[13px] leading-none items-center justify-center outline-none hover:bg-violet10 focus:relative focus:shadow-[0_0_0_2px] focus:shadow-violet7"
          style={{ marginLeft: "auto" }}
          onClick={handlePaste}
          aria-label="Paste"
          title="Paste (ctrl+v)"
        >
          <ClipboardIcon />
        </RadixToolbar.Button>

        <RadixToolbar.Separator className="w-[1px] bg-neutral-700 mx-[10px]" />

        <div className="flex">
          <span
            className="px-[10px] w-14 text-white flex-shrink-0 flex-grow-0 basis-auto h-full inline-flex text-[13px] leading-none items-center justify-center outline-none hover:bg-violet10 focus:relative focus:shadow-[0_0_0_2px] focus:shadow-violet7 select-none"
            title="Zoom (-/+/1)"
          >
            {Math.floor(stageScale * 100)}%
          </span>
        </div>
      </RadixToolbar.Root>
    </div>
  );
};

export default Toolbar;
