import { useEffect, useState } from "react";
import { Model } from "../App.d";
import { useAppDispatch, useAppSelector } from "../hooks";
import {
  selectBackend,
  selectSelectedModel,
  setSelectedModel,
} from "../state/optionsSlice";
import useData, { FetchPolicy } from "./useData";
import useSocket from "./useSocket";
import { selectIsConnected } from "../state/statsSlice";
import { isSdXlModel } from "../utils";

type Props = {
  fetchPolicy?: FetchPolicy;
};

const useModels = ({ fetchPolicy }: Props = {}) => {
  const { channel, sendMessage } = useSocket();
  const isConnected = useAppSelector(selectIsConnected);
  const selectedModel = useAppSelector(selectSelectedModel);
  const backend = useAppSelector(selectBackend);
  const dispatch = useAppDispatch();
  //FIXME: remove useState and redux instead to sync across multiple usages
  const [isModelLoading, setIsModelLoading] = useState<boolean>(false);

  const { fetchData, data: models } = useData<Model[]>({
    name: "models",
    fetchPolicy,
  });

  const { fetchData: fetchVaes, data: vaes } = useData<string[]>({
    name: "vaes",
    fetchPolicy,
  });

  const setModel = async (model: Model["sha256"] | Model["model_name"]) => {
    if (isConnected) {
      if (backend === "auto") {
        const modelObj = models?.find(({ sha256 }) => model === sha256);
        if (modelObj) {
          selectedModel?.hash &&
            selectedModel.hash !== model &&
            sendMessage("set_model", modelObj.title);
          //TODO: handle failure
          dispatch(
            setSelectedModel({
              hash: modelObj.sha256,
              name: modelObj.model_name,
              isSdXl: isSdXlModel(modelObj.model_name),
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
            isSdXl: isSdXlModel(model),
          })
        );
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
      return () => {
        channel.off("is_model_loading", ref);
      };
    }
  }, [channel]);

  return {
    isModelLoading,
    models,
    setModel,
    fetchData,
    selectedModel,
    vaes,
    fetchVaes,
  };
};

export default useModels;
