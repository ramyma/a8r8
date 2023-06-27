import { Sampler } from "../App.d";
import useData, { FetchPolicy } from "./useData";

type Props = {
  // selectedModel: Model["sha256"];
  fetchPolicy?: FetchPolicy;
};

const useSamplers = ({ fetchPolicy }: Props = {}) => {
  // const [models, setModels] = useState<Model[]>();

  const { fetchData, data: samplers } = useData<Sampler[]>({
    name: "samplers",
    fetchPolicy,
  });

  return { samplers, fetchData };
};

export default useSamplers;
