import { Options } from "../App.d";
import { useAppDispatch } from "../hooks";
import { setSelectedModel } from "../state/optionsSlice";
import useData, { FetchPolicy } from "./useData";

type Props = { fetchPolicy?: FetchPolicy };

const useOptions = ({ fetchPolicy }: Props = {}) => {
  const dispatch = useAppDispatch();

  const callback = (options: Options) => {
    // console.log(options);
    dispatch(setSelectedModel(options.sd_checkpoint_hash));
  };

  const { data: options, fetchData } = useData<Options>({
    name: "options",
    fetchPolicy,
    callback,
  });

  const refetch = async () => {
    const options = await fetchData();
    callback(options);
  };

  return { options, refetch };
};

export default useOptions;
