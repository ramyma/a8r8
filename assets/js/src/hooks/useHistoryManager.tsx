import { emitCustomEvent } from "react-custom-events";
import { useAppDispatch, useAppSelector } from "../hooks";
import { redo, selectHistory, undo } from "../state/historySlice";
import useGlobalKeydown from "./useGlobalKeydown";
import { KeyboardEventHandler, useRef } from "react";

function useHistoryManager() {
  const { past, future } = useAppSelector(selectHistory);
  const dispatch = useAppDispatch();
  const pastLengthRef = useRef(past.length);

  if (pastLengthRef.current !== past.length) {
    pastLengthRef.current = past.length;
  }

  const undoHistory = () => {
    if (past.length && pastLengthRef.current === past.length) {
      pastLengthRef.current = past.length - 1;
      const historyItem = past[past.length - 1];
      dispatch(undo());
      emitCustomEvent("custom-undo", historyItem);
    }
  };
  const redoHistory = () => {
    if (future.length) {
      const historyItem = future[future.length - 1];
      dispatch(redo());
      emitCustomEvent("custom-redo", historyItem);
    }
  };

  const handleKeydown: KeyboardEventHandler = (e) => {
    if (e.key.toLocaleLowerCase() === "z" && e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      undoHistory();
    }
    if (
      ((e.key.toLocaleLowerCase().toLocaleLowerCase() === "z" && e.shiftKey) ||
        e.key.toLocaleLowerCase() === "y") &&
      e.ctrlKey
    ) {
      e.preventDefault();
      redoHistory();
    }
  };

  useGlobalKeydown({ handleKeydown });

  return {
    undoHistory,
    redoHistory,
    hasAvailableUndo: past.length > 0,
    hasAvailableRedo: future.length > 0,
  };
}

export default useHistoryManager;
