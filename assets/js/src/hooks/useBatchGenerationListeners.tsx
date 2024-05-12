import { useCustomEventListener } from "react-custom-events";
import { emitBatchGenerationProps } from "../Canvas/hooks/useCustomEventsListener";

export type UseBatchGenerationListenersProps = {
  handleBatchPreviewImageSelection?: (image: string) => void;
  handleApplyActiveBatchImage?: () => void;
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

  useCustomEventListener("applyActiveBatchImage", handleApplyActiveBatchImage);

  useCustomEventListener("batchGenerationProps", handleBatchGenerationProps);
};

export default useBatchGenerationListeners;
