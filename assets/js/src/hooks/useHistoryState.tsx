import { useState } from "react";
import { useCustomEventListener } from "react-custom-events";
import {
  HistoryItem,
  HistoryTopic,
  addHistoryItem,
} from "../state/historySlice";
import { useAppDispatch } from "../hooks";

export interface Props<T> {
  topic: HistoryTopic;
  /**
   *
   * @param item Removed history item
   */
  undoCallback?: (params: { items: T[]; isStateEmpty: boolean }) => void;

  /**
   *
   * @param item Added history item
   */
  redoCallback?: (item: T[]) => void;
  /**
   *
   * Clear history callback logic
   */
  clearCallback?: () => void;
}
const useHistoryState = <T,>({
  topic,
  undoCallback,
  redoCallback,
  clearCallback,
}: Props<T>) => {
  const dispatch = useAppDispatch();
  const [undoHistory, setUndoHistory] = useState<T[] | T[][]>([]);
  const [redoHistory, setRedoHistory] = useState<T[] | T[][]>([]);
  const [state, setState] = useState<T[]>([]);

  const setHistoryStateItem = (
    historyItem: T | T[],
    eventLabel,
    overwrite = false
  ) => {
    if (overwrite && Array.isArray(historyItem)) {
      setUndoHistory((undoHistory) => [
        ...undoHistory,
        historyItem.slice(0, -1),
      ]);
      setState(historyItem);
    } else {
      setUndoHistory((undoHistory) => [...undoHistory, state]);
      setState((state) => [...state, historyItem]);
    }

    // if (Array.isArray(historyItem))
    //   setState((state) => [...state, ...historyItem]);
    // else setState((state) => [...state, historyItem]);
    setRedoHistory([]);
    dispatchHistoryEvent({ label: eventLabel });
  };

  const clearHistoryStateItem = (eventLabel) => {
    setUndoHistory((undoHistory) => [...undoHistory, state]);
    setState([]);
    setRedoHistory([]);
    clearCallback?.();
    dispatchHistoryEvent({ label: eventLabel });
  };

  const undo = () => {
    if (undoHistory.length) {
      setRedoHistory((redoHistory) => [...redoHistory, state]);
      if (undoCallback) {
        const removedItems =
          state.length > 0
            ? [state?.[state.length - 1]]
            : (undoHistory?.[undoHistory.length - 1] as T[]);
        undoCallback({
          items: removedItems,
          isStateEmpty: state?.length === 0,
        });
        // undoCallback(undoHistory[undoHistory.length - 1]);
      }
      setState(undoHistory[undoHistory.length - 1]);
      setUndoHistory((undoHistory) => undoHistory.slice(0, -1));
    }
  };

  const redo = () => {
    if (redoHistory.length) {
      setUndoHistory((undoHistory) => [...undoHistory, state]);
      if (redoCallback) {
        const items = redoHistory?.[redoHistory.length - 1];
        redoCallback(items);
        // redoCallback(redoHistory[redoHistory.length - 1]);
      }
      setState(redoHistory[redoHistory.length - 1]);
      setRedoHistory((redoHistory) => redoHistory.slice(0, -1));
    }
  };

  useCustomEventListener("custom-undo", (historyItem: HistoryItem) => {
    if (historyItem.topic === topic) {
      undo();
    }
  });
  useCustomEventListener("custom-redo", (historyItem: HistoryItem) => {
    if (historyItem.topic === topic) {
      redo();
    }
  });

  const dispatchHistoryEvent = ({ label }: { label: string }) => {
    dispatch(
      addHistoryItem({
        label,
        topic,
      })
    );
  };

  return {
    setHistoryStateItem,
    clearHistoryStateItem,
    dispatchHistoryEvent,
    undo,
    redo,
    state,
    setState,
  };
};

export default useHistoryState;
