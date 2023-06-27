import { emitCustomEvent } from "react-custom-events";
import { useAppDispatch, useAppSelector } from "../hooks";
import { redo, selectHistory, undo } from "../state/historySlice";
import useGlobalKeydown from "./useGlobalKeydown";

function useHistoryManager() {
  const { past, future } = useAppSelector(selectHistory);
  const dispatch = useAppDispatch();

  const undoHistory = () => {
    past.length && emitCustomEvent("custom-undo", past[past.length - 1]);
    dispatch(undo());
  };
  const redoHistory = () => {
    future.length && emitCustomEvent("custom-redo", future[future.length - 1]);
    dispatch(redo());
  };

  const handleKeydown = (e: KeyboardEvent) => {
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
