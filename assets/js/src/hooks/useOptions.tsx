import { useCallback, useEffect } from "react";
import { Options } from "../App.d";
import { useAppDispatch, useAppSelector } from "../hooks";
import {
  selectBackend,
  setSelectedVae,
  setSelectedModel,
} from "../state/optionsSlice";
import { checkIsSdFluxModel, checkIsSdXlModel } from "../utils";
import useData, { FetchPolicy } from "./useData";
import useModels from "./useModels";

type Props = { fetchPolicy?: FetchPolicy };

const useOptions = ({ fetchPolicy }: Props = {}) => {
  const dispatch = useAppDispatch();
  const backend = useAppSelector(selectBackend);
  const { models } = useModels();
  const { data: options, fetchData } = useData<Options>({
    name: "options",
    fetchPolicy,
    condition: backend === "auto" || backend == "forge",
  });
  const updateSelectedModel = useCallback(
    (options: Options) => {
      // console.log(options);
      if (backend === "auto" || backend == "forge") {
        const model = models?.find(
          (model) => model?.sha256 === options?.sd_checkpoint_hash
        );

        dispatch(
          setSelectedModel({
            hash: options.sd_checkpoint_hash,
            name: model?.model_name ?? "",
            isSdXl: checkIsSdXlModel(model?.model_name as string),
            isFlux: checkIsSdFluxModel(model?.model_name as string),
          })
        );

        dispatch(setSelectedVae(options.sd_vae));
      }
    },
    [backend, dispatch, models]
  );
  useEffect(() => {
    models && options && updateSelectedModel(options);
  }, [updateSelectedModel, models, options]);

  const refetch = async () => {
    const options = await fetchData();
    updateSelectedModel(options);
  };

  return { options, refetch };
};

export default useOptions;
