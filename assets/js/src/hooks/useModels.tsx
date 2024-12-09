import { useEffect, useState } from "react";
import { Model, ModelType, Vae } from "../App.d";
import { useAppDispatch, useAppSelector } from "../hooks";
import {
  selectBackend,
  selectSelectedClipModel,
  selectSelectedClipModel2,
  selectSelectedClipModels,
  selectSelectedModel,
  selectSelectedVae,
  setSelectedClipModel,
  setSelectedClipModel2,
  setSelectedClipModels,
  setSelectedModel,
  setSelectedVae,
} from "../state/optionsSlice";
import useData, { FetchPolicy } from "./useData";
import useSocket from "./useSocket";
import { selectIsConnected } from "../state/statsSlice";
import {
  checkIsPonyModel,
  checkIsSd35Model,
  checkIsSdFluxModel,
  checkIsSdXlModel,
  getModelWithParams,
} from "../utils";
import { MainFormValues } from "../MainForm/MainForm";

type Props = {
  fetchPolicy?: FetchPolicy;
};

const useModels = ({ fetchPolicy }: Props = {}) => {
  const { channel, sendMessage, sendMessageAndReceive } = useSocket();
  const isConnected = useAppSelector(selectIsConnected);
  const selectedModel = useAppSelector(selectSelectedModel);
  const selectedVae = useAppSelector(selectSelectedVae);
  const selectedClipModel = useAppSelector(selectSelectedClipModel);
  const selectedClipModel2 = useAppSelector(selectSelectedClipModel2);
  const selectedClipModels = useAppSelector(selectSelectedClipModels);
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

  const { fetchData: fetchClipModels, data: clipModels } = useData<string[]>({
    name: "clip_models",
    fetchPolicy,
  });

  const loadModelConfig = async (
    modelName: string
  ): Promise<Partial<MainFormValues> & { vae: string }> =>
    sendMessageAndReceive("load_model_config", {
      model_name: modelName,
      backend,
    });

  const setModel = async (model: Model["sha256"] | Model["model_name"]) => {
    if (isConnected) {
      if (backend === "auto" || backend === "forge") {
        const modelObj = models?.find(({ model_name }) => model === model_name);
        if (modelObj) {
          selectedModel?.hash &&
          selectedModel.hash !== model &&
          backend === "auto"
            ? sendMessage("set_model", modelObj.title)
            : sendMessage("set_model", {
                title: /\S*/i.exec(modelObj.title)?.[0] ?? "",
                hash: modelObj.sha256,
              });

          const isSdXl = checkIsSdXlModel(modelObj.model_name);
          const isFlux = checkIsSdFluxModel(modelObj.model_name);
          const isPony = checkIsPonyModel(modelObj.model_name);
          const isSd35 = checkIsSd35Model(modelObj.model_name);

          const modelType: ModelType = isPony
            ? "pony"
            : isSdXl
              ? "sdxl"
              : isFlux
                ? "flux"
                : isSd35
                  ? "sd3.5"
                  : "sd1.5";

          //TODO: handle failure
          dispatch(
            setSelectedModel({
              hash: modelObj.sha256,
              name: modelObj.model_name,
              isSdXl,
              isFlux,
              isPony,
              isSd35,
              modelType,
            })
          );
          if (backend === "forge") {
            sendMessage("set_additional_modules", [
              ...(/automatic/i.test(selectedVae ?? "") ? [] : [selectedVae]),
              ...(isFlux && selectedClipModel ? [selectedClipModel] : []),
              ...(isFlux && selectedClipModel2 ? [selectedClipModel2] : []),
            ]);
          }
        } else {
          // sendMessage("set_model", model);
          // //TODO: handle failure
          // dispatch(setSelectedModel({ name: model }));
        }
      } else {
        dispatch(setSelectedModel(getModelWithParams(model)));
      }
    }
  };

  const setVae = async (vae: string) => {
    if (isConnected) {
      if (vae) {
        if (backend === "auto") {
          selectedVae !== vae && sendMessage("set_vae", vae);
        } else if (backend === "forge") {
          selectedVae !== vae &&
            sendMessage("set_additional_modules", [
              ...(/automatic/i.test(vae) ? [] : [vae]),
              ...(selectedModel.isFlux && selectedClipModel
                ? [selectedClipModel]
                : []),
              ...(selectedModel.isFlux && selectedClipModel2
                ? [selectedClipModel2]
                : []),
            ]);
        }
        //TODO: handle failure
        dispatch(setSelectedVae(vae));
      }
    }
  };

  const setClipModel = (clipModel: string) => {
    if (backend === "forge") {
      selectedClipModel !== clipModel &&
        sendMessage("set_additional_modules", [
          ...(/automatic/i.test(selectedVae ?? "") ? [] : [selectedVae]),
          ...(clipModel ? [clipModel] : []),
          ...(selectedClipModel2 ? [selectedClipModel2] : []),
        ]);
    }
    dispatch(setSelectedClipModel(clipModel));
  };

  const setClipModel2 = (clipModel: string) => {
    if (backend === "forge") {
      selectedClipModel !== clipModel &&
        sendMessage("set_additional_modules", [
          ...(/automatic/i.test(selectedVae ?? "") ? [] : [selectedVae]),
          ...(selectedClipModel ? [selectedClipModel] : []),
          ...(clipModel ? [clipModel] : []),
        ]);
    }
    dispatch(setSelectedClipModel2(clipModel));
  };

  const setClipModels = (clipModels: string[]) => {
    if (backend === "forge") {
      selectedClipModels !== clipModels &&
        sendMessage("set_additional_modules", [
          ...(/automatic/i.test(selectedVae ?? "") ? [] : [selectedVae]),
          ...(selectedClipModels ?? []),
        ]);
    }
    dispatch(setSelectedClipModels(clipModels));
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
    setClipModel,
    setClipModel2,
    setClipModels,
    fetchData,
    selectedModel,
    selectedVae,
    selectedClipModel,
    selectedClipModel2,
    selectedClipModels,
    fetchVaes,
    fetchClipModels,
    clipModels,
    loadModelConfig,
  };
};

export default useModels;
