import { Lora, Model } from "../App.d";
import useData, { FetchPolicy, UseDataProps } from "./useData";

type Props = {
  fetchPolicy?: FetchPolicy;
  callback?: UseDataProps<Lora[]>["callback"];
};

const useLoras = ({ fetchPolicy, callback }: Props = {}) => {
  const { fetchData, data: loras } = useData<Lora[] | undefined>({
    name: "loras",
    fetchPolicy,
    callback,
  });

  return { loras, fetchData };
};

export default useLoras;
