import { Reducer, useReducer } from "react";
import { BrushStroke } from "../../MaskLayer-types";

type ControlnetLinesReducerAction = {
  type: "UPDATE" | "CLEAR";
  payload?: { id: string; lines: BrushStroke[] };
};

type LinesMap = Record<string, BrushStroke[]>;

const linesReducer: Reducer<LinesMap, ControlnetLinesReducerAction> = (
  state,
  action
) => {
  const { payload } = action;
  if (action.type === "UPDATE" && payload) {
    return Object.assign(state, {
      [payload.id]: payload.lines,
    });
  }
  if (action.type === "CLEAR") {
    return {};
  }
  return state;
};

type Props = { initialLines?: LinesMap } | undefined;

const useLines = ({ initialLines }: Props = {}): [
  LinesMap,
  React.Dispatch<ControlnetLinesReducerAction>,
] => {
  const [lines, dispatchLines] = useReducer(linesReducer, initialLines ?? {});

  return [lines, dispatchLines];
};

export default useLines;
