import { useState } from "react";
import { useCustomEventListener } from "react-custom-events";
import {
  HistoryItem,
  HistoryTopic,
  addHistoryItem,
} from "../state/historySlice";
import { useAppDispatch } from "../hooks";

interface Props {
  topic: HistoryTopic;
}
const useHistoryState = <T,>({ topic }: Props) => {
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
    dispatchHistoryEvent({ label: eventLabel });
  };

  const undo = () => {
    if (undoHistory.length) {
      setRedoHistory((redoHistory) => [...redoHistory, state]);
      setState(undoHistory[undoHistory.length - 1]);
      setUndoHistory((undoHistory) => undoHistory.slice(0, -1));
    }
  };

  const redo = () => {
    if (redoHistory.length) {
      setUndoHistory((undoHistory) => [...undoHistory, state]);
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
