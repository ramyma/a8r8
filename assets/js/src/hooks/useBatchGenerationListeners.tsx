import { useCustomEventListener } from "react-custom-events";
import { emitBatchGenerationProps } from "../Canvas/hooks/useCustomEventsListener";
import { useAppSelector } from "../hooks";
import { selectBatchImageResultsLayer } from "../state/canvasSlice";

export type UseBatchGenerationListenersProps = {
  handleBatchPreviewImageSelection?: (image: string) => void;
  handleApplyActiveBatchImage?: (batchImageResultsLayer?: string) => void;
  handleBatchGenerationProps?: (
    args: Parameters<typeof emitBatchGenerationProps>[0]
  ) => void;
};

const useBatchGenerationListeners = ({
  handleBatchPreviewImageSelection = () => {},
  handleApplyActiveBatchImage = () => {},
  handleBatchGenerationProps = () => {},
}: UseBatchGenerationListenersProps) => {
  useCustomEventListener(
    "batchPreviewImageSelection",
    handleBatchPreviewImageSelection
  );

  const batchImageResultsLayer = useAppSelector(selectBatchImageResultsLayer);

  useCustomEventListener("applyActiveBatchImage", () =>
    handleApplyActiveBatchImage(batchImageResultsLayer)
  );

  useCustomEventListener("batchGenerationProps", handleBatchGenerationProps);
};

export default useBatchGenerationListeners;
