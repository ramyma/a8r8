import { Lora, Model } from "../App.d";
import useData, { FetchPolicy } from "./useData";

type Props = {
  fetchPolicy?: FetchPolicy;
};

const useLoras = ({ fetchPolicy }: Props = {}) => {
  const { fetchData, data: loras } = useData<Lora[] | undefined>({
    name: "loras",
    fetchPolicy,
  });

  return { loras, fetchData };
};

export default useLoras;
