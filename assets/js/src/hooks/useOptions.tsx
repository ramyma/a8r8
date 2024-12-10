import { useCallback, useEffect } from "react";
import { Options } from "../App.d";
import { useAppDispatch, useAppSelector } from "../hooks";
import {
  selectBackend,
  setSelectedVae,
  setSelectedModel,
  setSelectedClipModels,
} from "../state/optionsSlice";
import {
  checkIsSd35Model,
  checkIsSdFluxModel,
  checkIsSdXlModel,
} from "../utils";
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
      if (backend === "auto" || backend === "forge") {
        const model = models?.find((model) =>
          backend === "forge"
            ? options?.sd_model_checkpoint.includes(model?.model_name)
            : model?.sha256 === options?.sd_checkpoint_hash
        );

        const isSdXl = checkIsSdXlModel(model?.model_name as string);
        const isFlux = checkIsSdFluxModel(model?.model_name as string);
        const isSd35 = checkIsSd35Model(model?.model_name as string);

        dispatch(
          setSelectedModel({
            hash: options.sd_checkpoint_hash,
            name: model?.model_name ?? "",
            isSdXl,
            isFlux,
          })
        );

        if (backend === "auto") {
          dispatch(setSelectedVae(options.sd_vae));
        } else {
          const optionsVae =
            options.forge_additional_modules?.find((m) => /vae/i.test(m)) ??
            "automatic";
          const [optionsClipModel, optionsClipModel2] =
            options.forge_additional_modules?.filter((m) =>
              /text_encoder/i.test(m)
            ) ?? [];

          (isFlux || isSd35) &&
            optionsClipModel &&
            dispatch(
              setSelectedClipModels([optionsClipModel, optionsClipModel2])
            );

          optionsVae && dispatch(setSelectedVae(optionsVae));
        }
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
