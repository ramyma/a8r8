// import { useAppSelector } from "../hooks";
// import { selectBackend } from "../state/optionsSlice";
import useData, { FetchPolicy } from "./useData";

type Props = {
  fetchPolicy?: FetchPolicy;
};

const useSchedulers = ({ fetchPolicy }: Props = {}) => {
  // const backend = useAppSelector(selectBackend);
  const { fetchData, data: schedulers } = useData<string[]>({
    name: "schedulers",
    fetchPolicy,
    // condition: backend === "comfy",
  });

  return { schedulers, fetchData };
};

export default useSchedulers;
