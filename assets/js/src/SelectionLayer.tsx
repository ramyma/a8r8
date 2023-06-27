import React, { RefObject, useContext, useRef } from "react";
import RefsContext from "./context/RefsContext";
import SelectionBox from "./SelectionBox";
import { useAppSelector } from "./hooks";
import { selectSessions } from "./state/sessionsSlice";
import { sessionName } from "./context/SocketProvider";
import {
  DEFAULT_HEIGHT_VALUE,
  DEFAULT_WIDTH_VALUE,
  selectSelectionBox,
} from "./state/selectionBoxSlice";
import { selectIsGenerating, selectStats } from "./state/statsSlice";
import { Layer } from "react-konva";

const SelectionLayer = () => {
  const { selectionBoxLayerRef } = useContext(RefsContext);
  const sessions = useAppSelector(selectSessions);

  const { height, width, x, y } = useAppSelector(selectSelectionBox);
  const isGenerating = useAppSelector(selectIsGenerating);
  const { isConnected, progress, generatingSessionName } =
    useAppSelector(selectStats);

  return (
    <Layer ref={selectionBoxLayerRef}>
      {isConnected &&
        Object.entries(sessions)
          ?.filter(([name]) => name !== sessionName)
          .map(([sessionName, metas]) => (
            <SelectionBox
              key={sessionName}
              x={metas?.selectionBox?.x}
              y={metas?.selectionBox?.y}
              width={metas?.selectionBox?.width ?? DEFAULT_WIDTH_VALUE}
              height={metas?.selectionBox?.height ?? DEFAULT_HEIGHT_VALUE}
              isGenerating={
                generatingSessionName === sessionName && isGenerating
              }
              progress={generatingSessionName === sessionName ? progress : 0}
              remoteSession
            />
          ))}
      <SelectionBox
        x={x}
        y={y}
        width={width}
        height={height}
        isGenerating={generatingSessionName === sessionName && isGenerating}
        progress={generatingSessionName === sessionName ? progress : 0}
      />
    </Layer>
  );
};

export default SelectionLayer;
