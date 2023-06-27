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
const useHistoryState = <H, S>({ topic }: Props) => {
  const dispatch = useAppDispatch();
  const [undoHistory, setUndoHistory] = useState<H[]>([]);
  const [redoHistory, setRedoHistory] = useState<H[]>([]);
  const [state, setState] = useState<S[]>([]);

  const addHistoryStateItem = (historyItem: H) => {
    setUndoHistory((undoHistory) => [...undoHistory, state]);
    setState((state) => [...state, historyItem]);
    setRedoHistory([]);
  };

  const undo = () => {
    if (undoHistory.length) {
      const undoStep = undoHistory[undoHistory.length - 1];
      //FIXME: undo of clear is not working

      if (
        Array.isArray(undoStep) &&
        state.length === 0 &&
        undoHistory.length - 2 >= 0
      ) {
        if (state.length === 0 && undoHistory.length - 2 >= 0) {
          setState(undoHistory[undoHistory.length - 2] as S[]);
        }
      } else {
        setState((state) => state.slice(0, state.length - 1));
      }

      setRedoHistory((redoHistory) => [...redoHistory, undoStep]);
      setUndoHistory((undoHistory) => undoHistory.slice(0, -1));
    }
  };

  const redo = () => {
    if (redoHistory.length) {
      const redoStep = redoHistory[redoHistory.length - 1];
      if (Array.isArray(redoStep)) {
        setState(redoStep);
      } else {
        setState((state) => [...state, redoStep] as S[]);
      }

      setRedoHistory((redoHistory) => redoHistory.slice(0, -1));
      setUndoHistory((undoHistory) => [...undoHistory, redoStep]);
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
    // emitCustomEvent("custom-history-event", {
    //   label,
    //   topic,
    // } as HistoryItem);
    dispatch(
      addHistoryItem({
        label,
        topic,
      })
    );
  };

  return {
    addHistoryStateItem,
    dispatchHistoryEvent,
    undo,
    redo,
    state,
    setState,
  };
};

export default useHistoryState;
