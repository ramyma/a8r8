import { useContext, useEffect } from "react";
import SocketContext from "../context/SocketContext";
import { useAppDispatch } from "../hooks";
import { updateStats } from "../state/statsSlice";

type ProgressData = {
  etaRelative: number;
  progress: number;
  currentImage: string;
  isGenerating: boolean;
  generatingSessionName: string;
};

type Props = {
  handleProgress?: (data: ProgressData) => void;
};
const useProgress = ({ handleProgress }: Props) => {
  const { channel } = useContext(SocketContext);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (channel) {
      const progressRef = channel?.on("progress", (data: ProgressData) => {
        // console.log(data);
        if (handleProgress) {
          handleProgress(data);
        } else {
          const { etaRelative, progress, isGenerating, generatingSessionName } =
            data;
          dispatch(
            updateStats({
              progress,
              etaRelative,
              isGenerating,
              generatingSessionName,
            })
          );
        }
      });
      return () => {
        channel.off("progress", progressRef);
      };
    }
  }, [channel, dispatch, handleProgress]);
};

export default useProgress;
