import { Lora } from "../App.d";
import useBackend from "./useBackend";
import useData, { FetchPolicy, UseDataProps } from "./useData";

type Props = {
  fetchPolicy?: FetchPolicy;
  callback?: UseDataProps<Lora[]>["callback"];
};

const useLoras = ({ fetchPolicy, callback }: Props = {}) => {
  const { backend } = useBackend();

  const { fetchData, data: loras } = useData<Lora[] | undefined>({
    name:
      backend === "comfy" || backend === "forge"
        ? "loras_with_metadata"
        : "loras",
    fetchPolicy,
    callback,
    condition: !!backend,
  });

  return { loras: loras ?? [], fetchData };
};

export default useLoras;
