import { Lora, Model } from "../App.d";
import { useAppSelector } from "../hooks";
import useData, { FetchPolicy } from "./useData";

type Props = {
  fetchPolicy?: FetchPolicy;
};

const useLoras = ({ fetchPolicy }: Props = {}) => {
  const { fetchData, data: loras } = useData<Lora[]>({
    name: "loras",
    fetchPolicy,
  });

  return { loras, fetchData };
};

export default useLoras;
