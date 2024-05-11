import { useEffect, useState } from "react";
import { Model, Vae } from "../App.d";
import { useAppDispatch, useAppSelector } from "../hooks";
import {
  selectBackend,
  selectSelectedModel,
  selectSelectedVae,
  setSelectedModel,
  setSelectedVae,
} from "../state/optionsSlice";
import useData, { FetchPolicy } from "./useData";
import useSocket from "./useSocket";
import { selectIsConnected } from "../state/statsSlice";
import { checkIsSdXlModel } from "../utils";

type Props = {
  fetchPolicy?: FetchPolicy;
};

const useModels = ({ fetchPolicy }: Props = {}) => {
  const { channel, sendMessage } = useSocket();
  const isConnected = useAppSelector(selectIsConnected);
  const selectedModel = useAppSelector(selectSelectedModel);
  const selectedVae = useAppSelector(selectSelectedVae);
  const backend = useAppSelector(selectBackend);
  const dispatch = useAppDispatch();
  //FIXME: remove useState and redux instead to sync across multiple usages
  const [isModelLoading, setIsModelLoading] = useState<boolean>(false);
  const [isVaeLoading, setIsVaeLoading] = useState<boolean>(false);

  const { fetchData, data: models } = useData<Model[]>({
    name: "models",
    fetchPolicy,
  });

  const { fetchData: fetchVaes, data: vaes } = useData<Vae[]>({
    name: "vaes",
    fetchPolicy,
  });

  const setModel = async (model: Model["sha256"] | Model["model_name"]) => {
    if (isConnected) {
      if (backend === "auto") {
        const modelObj = models?.find(({ model_name }) => model === model_name);
        if (modelObj) {
          selectedModel?.hash &&
            selectedModel.hash !== model &&
            sendMessage("set_model", modelObj.title);
          //TODO: handle failure
          dispatch(
            setSelectedModel({
              hash: modelObj.sha256,
              name: modelObj.model_name,
              isSdXl: checkIsSdXlModel(modelObj.model_name),
            })
          );
        } else {
          // sendMessage("set_model", model);
          // //TODO: handle failure
          // dispatch(setSelectedModel({ name: model }));
        }
      } else {
        dispatch(
          setSelectedModel({
            name: model,
            isSdXl: checkIsSdXlModel(model),
          })
        );
      }
    }
  };

  const setVae = async (vae: string) => {
    if (isConnected) {
      if (backend === "auto") {
        if (vae) {
          selectedVae !== vae && sendMessage("set_vae", vae);
          //TODO: handle failure
          dispatch(setSelectedVae(vae));
        }
      } else {
        dispatch(setSelectedVae(vae));
      }
    }
  };

  useEffect(() => {
    if (channel) {
      const ref = channel.on(
        "is_model_loading",
        ({ is_model_loading }: { is_model_loading: boolean }) => {
          setIsModelLoading(is_model_loading);
        }
      );
      const vaeRef = channel.on(
        "is_vae_loading",
        ({ is_vae_loading }: { is_vae_loading: boolean }) => {
          setIsVaeLoading(is_vae_loading);
        }
      );
      return () => {
        channel.off("is_model_loading", ref);
        channel.off("is_vae_loading", vaeRef);
      };
    }
  }, [channel]);

  return {
    isModelLoading,
    isVaeLoading,
    models,
    vaes,
    setModel,
    setVae,
    fetchData,
    selectedModel,
    selectedVae,
    fetchVaes,
  };
};

export default useModels;
