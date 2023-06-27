import { useCallback, useContext } from "react";
import useGlobalKeydown from "../../hooks/useGlobalKeydown";
import {
  selectSelectionBox,
  updateSelectionBox,
} from "../../state/selectionBoxSlice";
import { useAppDispatch, useAppSelector } from "../../hooks";
import RefsContext from "../../context/RefsContext";
import { selectIsGenerating } from "../../state/statsSlice";

const OFFSET = 8;
const SHIFT_FACTOR = 5;

const useKeyEvents = () => {
  const { selectionBoxRef } = useContext(RefsContext);

  const dispatch = useAppDispatch();

  const isGenerating = useAppSelector(selectIsGenerating);
  const { x, y } = useAppSelector(selectSelectionBox);

  const handleKeydown = useCallback(
    (e: KeyboardEvent) => {
      if (selectionBoxRef?.current && !isGenerating) {
        const offset = OFFSET * (e.shiftKey ? SHIFT_FACTOR : 1);
        if (e.key === "ArrowLeft") {
          dispatch(updateSelectionBox({ x: x - offset }));
        }
        if (e.key === "ArrowRight") {
          dispatch(updateSelectionBox({ x: x + offset }));
        }
        if (e.key === "ArrowUp") {
          dispatch(updateSelectionBox({ y: y - offset }));
        }
        if (e.key === "ArrowDown") {
          dispatch(updateSelectionBox({ y: y + offset }));
        }
      }
    },
    [dispatch, isGenerating, selectionBoxRef, x, y]
  );

  useGlobalKeydown({ handleKeydown });
};

export default useKeyEvents;
