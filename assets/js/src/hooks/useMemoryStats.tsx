import { useEffect } from "react";
import { MemoryStats } from "../App.d";
import useData, { FetchPolicy } from "./useData";
import useSocket from "./useSocket";
import { useAppDispatch } from "../hooks";
import { updateStats } from "../state/statsSlice";

type Props = {
  fetchPolicy?: FetchPolicy;
};

const useMemoryStats = ({ fetchPolicy }: Props = {}) => {
  const { channel } = useSocket();
  const dispatch = useAppDispatch();

  const { fetchData, data: memoryStats } = useData<MemoryStats[]>({
    name: "memory",
    fetchPolicy,
  });

  useEffect(() => {
    if (channel) {
      const memoryRef = channel.on("memory", (data) => {
        dispatch(updateStats(data));
      });

      return () => {
        channel.off("memory", memoryRef);
      };
    }
  }, [channel, dispatch]);

  return { memoryStats, fetchData };
};

export default useMemoryStats;
