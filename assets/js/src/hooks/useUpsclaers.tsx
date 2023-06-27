import { useAppSelector } from "../hooks";
import useData, { FetchPolicy } from "./useData";

type Props = {
  // selectedModel: Model["sha256"];
  fetchPolicy?: FetchPolicy;
};

const useUpscalers = ({ fetchPolicy }: Props = {}) => {
  const { fetchData, data: upscalers } = useData<string[]>({
    name: "upscalers",
    fetchPolicy,
  });

  return { upscalers, fetchData };
};

export default useUpscalers;
