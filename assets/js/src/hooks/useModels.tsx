import { useEffect, useState } from "react";
import { Model } from "../App.d";
import { useAppDispatch, useAppSelector } from "../hooks";
import { selectSelectedModel, setSelectedModel } from "../state/optionsSlice";
import useData, { FetchPolicy } from "./useData";
import useSocket from "./useSocket";

type Props = {
  fetchPolicy?: FetchPolicy;
};

const useModels = ({ fetchPolicy }: Props = {}) => {
  const { channel, sendMessage } = useSocket();

  const selectedModel = useAppSelector(selectSelectedModel);
  const dispatch = useAppDispatch();
  //FIXME: remove useState and redux instead to sync across multiple usages
  const [isModelLoading, setIsModelLoading] = useState<boolean>(false);

  const { fetchData, data: models } = useData<Model[]>({
    name: "models",
    fetchPolicy,
  });

  const setModel = async (modelSha256: Model["sha256"]) => {
    const selectedModel = models?.find(({ sha256 }) => modelSha256 === sha256);
    if (selectedModel) {
      sendMessage("set_model", selectedModel.title);
      //TODO: handle failure
      dispatch(setSelectedModel(selectedModel.sha256));
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

  return { isModelLoading, models, setModel, fetchData, selectedModel };
};

export default useModels;
