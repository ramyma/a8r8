import { Group, Line, Rect } from "react-konva";

import { animated, easings, useSprings } from "@react-spring/web";
import { useAppSelector } from "../hooks";
import useScripts from "../hooks/useScripts";
import {
  PromptRegionLayer,
  selectIsRegionalPromptsEnabled,
  selectPromptRegionLayers,
  selectPromptRegionPreviewLayerId,
} from "../state/promptRegionsSlice";
import { selectRegionMaskLines } from "../state/linesSlice";
import { useContext, useMemo } from "react";
import RefsContext from "../context/RefsContext";
import { CanvasDimensions } from "../Canvas/Canvas.d";

const AnimatedRect = animated(Rect);
type Props = { dimensions: CanvasDimensions };

const RegionMasksPreview = ({ dimensions }: Props) => {
  const { stageRef } = useContext(RefsContext);

  const { hasForgeCouple } = useScripts();
  const isRegionalPromptsEnabled = useAppSelector(
    selectIsRegionalPromptsEnabled
  );
  const promptRegionLayers = useAppSelector(selectPromptRegionLayers);
  const promptRegionPreviewLayerId = useAppSelector(
    selectPromptRegionPreviewLayerId
  );

  const activePromptRegionPreview = useMemo<PromptRegionLayer | undefined>(
    () =>
      promptRegionLayers?.find(({ id }) => id === promptRegionPreviewLayerId),
    [promptRegionLayers, promptRegionPreviewLayerId]
  );

  const regionMaskLines = useAppSelector(selectRegionMaskLines);
  const [springs, _api] = useSprings(
    promptRegionLayers?.length ?? 0,
    (index) => ({
      to: {
        opacity:
          promptRegionPreviewLayerId === promptRegionLayers?.[index]?.id
            ? 0.5
            : 0,
      },
      config: { easing: easings.linear, duration: 200 },
    }),
    [promptRegionLayers, promptRegionPreviewLayerId]
  );

  // if (promptRegionPreviewLayerId !== prevPromptRegionPreviewLayerId) {
  //   setPrevpromptRegionPreviewLayerId(promptRegionPreviewLayerId);
  //   // api.set({ opacity: 1 });
  // }
  const stagePosition = stageRef?.current?.getAbsolutePosition() ?? {
    x: 0,
    y: 0,
  };

  const stageScale = stageRef?.current?.scale()?.x ?? 1;

  return (
    <>
      {hasForgeCouple &&
        isRegionalPromptsEnabled &&
        promptRegionPreviewLayerId &&
        activePromptRegionPreview &&
        !activePromptRegionPreview.isVisible && (
          <Group>
            {regionMaskLines?.[promptRegionPreviewLayerId]?.map(
              (line, index) => (
                <Line
                  key={promptRegionPreviewLayerId + index}
                  points={line.points}
                  stroke={activePromptRegionPreview?.maskColor || "#df4b26"}
                  strokeWidth={line.brushSize}
                  tension={0.4}
                  lineCap="round"
                  lineJoin="round"
                  globalCompositeOperation={
                    line.tool === "eraser" ? "destination-out" : "source-over"
                  }
                />
              )
            )}
            <AnimatedRect
              opacity={
                springs?.[
                  promptRegionLayers.findIndex(
                    ({ id }) => id === promptRegionPreviewLayerId
                  )
                ]?.opacity
              }
              offsetX={stagePosition.x / stageScale}
              offsetY={stagePosition.y / stageScale}
              height={dimensions.height / stageScale + 100}
              width={dimensions.width / stageScale + 100}
              fill="white"
              globalCompositeOperation={"destination-in"}
            />
          </Group>
        )}
    </>
  );
};

export default RegionMasksPreview;
