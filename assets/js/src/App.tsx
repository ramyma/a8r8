import { MouseEvent, useCallback, useMemo, useState } from "react";
import "./App.css";
import Canvas from "./Canvas/Canvas";
import Stats from "./Stats";
import MainForm from "./MainForm";
import LayersControl from "./LayersControl";
import { Model } from "./App.d";
import useModels from "./hooks/useModels";
import useOptions from "./hooks/useOptions";
import useSamplers from "./hooks/useSamplers";
import Notifications from "./Notifications";
import useControlnet from "./hooks/useControlnet";
import useIsConnected from "./hooks/useIsConnected";
import Select, { SelectProps } from "./components/Select";
import { GearIcon, ReloadIcon } from "@radix-ui/react-icons";
import useMemoryStats from "./hooks/useMemoryStats";
import useLoras from "./hooks/useLoras";
import useUpscalers from "./hooks/useUpsclaers";
import useClipboard from "./hooks/useClipboard";
import useDragAndDrop from "./hooks/useDragAndDrop";
import useEmbeddings from "./hooks/useEmbeddings";
import Toolbar from "./components/Toolbar";
import ScrollArea from "./components/ScrollArea";
import useHistoryManager from "./hooks/useHistoryManager";
import useScripts from "./hooks/useScripts";
import useConfig, { AppConfig } from "./hooks/useConfig";
import { useAppDispatch, useAppSelector } from "./hooks";
import {
  OptionsState,
  selectBackend,
  selectSelectedModel,
} from "./state/optionsSlice";
import useBackend from "./hooks/useBackend";
import useSchedulers from "./hooks/useSchedulers";
import { ActionCreators as UndoActionCreators } from "redux-undo";
import { useCustomEventListener } from "react-custom-events";
import { HistoryItem } from "./state/historySlice";
import Button from "./components/Button";
import BatchImageResults from "./BatchImageResults";
import ClipModelMultiSelect from "./MainForm/ClipModelMultiSelect";
import SettingsModal from "./SettingsModal/SettingsModal";
import { twMerge } from "tailwind-merge";

function App() {
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  const { refetch: refetchOptions } = useOptions({ fetchPolicy: "eager" });
  useSamplers({ fetchPolicy: "eager" });
  useSchedulers({ fetchPolicy: "eager" });
  useMemoryStats({ fetchPolicy: "eager" });

  useClipboard({ emit: true });
  useDragAndDrop({ emit: true });

  useHistoryManager();

  useControlnet({
    fetchPolicy: "eager",
  });

  // TODO: Capture reload and window close to prevent losing the working session

  useUpscalers({
    fetchPolicy: "eager",
  });

  useLoras({
    fetchPolicy: "eager",
  });

  useEmbeddings({
    fetchPolicy: "eager",
  });

  useScripts({
    fetchPolicy: "eager",
  });

  const { backend } = useBackend({
    fetchPolicy: "eager",
  });

  const {
    isModelLoading,
    isVaeLoading,
    models,
    setModel,
    setVae,
    setClipModels,
    selectedModel,
    selectedVae,
    selectedClipModels,
    fetchData: refetchModels,
    fetchVaes: refetchVaes,
    vaes,
    clipModels,
  } = useModels({
    fetchPolicy: "eager",
  });

  useIsConnected();

  useConfig({
    fetchPolicy: "eager",
  });

  useCustomEventListener(
    "apply-preset",
    (params: AppConfig["last_gen_config"]) => {
      if (backend === "comfy") {
        params?.model && setModel(params.model);
        params?.vae &&
          !(params?.model ?? "").toLocaleLowerCase().includes("gguf") &&
          setVae(params?.vae ?? "automatic");
        params?.clip_models && setClipModels(params.clip_models);
      }
    }
  );

  // const panelRef = useRef<HTMLDivElement>(null);
  // const { width } = useResize({ container: panelRef });

  // TODO: refactor into a more relevant part of the code
  const dispatch = useAppDispatch();

  useCustomEventListener("custom-undo", (historyItem: HistoryItem) => {
    if (historyItem.topic === "canvas/line") {
      dispatch(UndoActionCreators.undo());
    }
  });
  useCustomEventListener("custom-redo", (historyItem: HistoryItem) => {
    if (historyItem.topic === "canvas/line") {
      dispatch(UndoActionCreators.redo());
    }
  });

  const handleSettingsModalClose = () => {
    setIsSettingsModalVisible(false);
  };

  return (
    <div className="relative App w-screen h-screen m-0 p-0 bg-[#0d0d0d] overflow-hidden">
      <div className="relative flex h-full w-full ">
        <div
          // ref={panelRef}
          className="absolute left-0 top-0 max-w-[20vw] md:w-[17vw] lg:w-[33vw] flex flex-1 h-full bg-black/90 backdrop-blur-sm flex-col z-10 transition-all"
        >
          <ScrollArea>
            <div className="h-screen">
              <div className="flex p-4 px-6 flex-col gap-2">
                <Button
                  className="justify-between h-9 mb-2 text-sm"
                  fullWidth
                  onClick={() => setIsSettingsModalVisible(true)}
                >
                  Settings
                  <GearIcon />
                </Button>
                <ModelSelect
                  refetchOptions={refetchOptions}
                  isModelLoading={isModelLoading}
                  isVaeLoading={isVaeLoading}
                  models={models}
                  refetchModels={refetchModels}
                  setModel={setModel}
                  selectedModel={selectedModel && { name: selectedModel.name }}
                />
                <VaeSelect
                  refetchOptions={refetchOptions}
                  vaes={vaes}
                  refetchVaes={refetchVaes}
                  setVae={setVae}
                  selectedVae={selectedVae}
                  isVaeLoading={isVaeLoading}
                  isModelLoading={isModelLoading}
                />
                {(selectedModel?.isFlux || selectedModel?.isSd35) && (
                  <ClipModelMultiSelect
                    clipModels={clipModels}
                    setClipModels={setClipModels}
                    selectedClipModels={selectedClipModels}
                  />
                )}
              </div>
              <MainForm />
            </div>
          </ScrollArea>
        </div>
        <div className="relative flex-[9] w-full">
          <Stats />
          <Canvas />
          <Toolbar />
          <BatchImageResults />
        </div>
        <LayersControl />
        <Notifications />
        <SettingsModal
          open={isSettingsModalVisible}
          onClose={handleSettingsModalClose}
          key={String(isSettingsModalVisible)}
        />
        {/* <ModelsModal /> */}
      </div>
    </div>
  );
}
export default App;
export const ModelSelect = ({
  refetchOptions,
  models,
  setModel,
  refetchModels,
  selectedModel,
  isModelLoading,
  isVaeLoading,
  className = "",
  shouldSetDefaultValue,
}: {
  refetchOptions: () => void;
  models: Model[];
  setModel;
  refetchModels;
  selectedModel: OptionsState["selectedModel"];
  isModelLoading: boolean;
  isVaeLoading: boolean;
  className?: string;
  shouldSetDefaultValue?: boolean;
}) => {
  const backend = useAppSelector(selectBackend);

  const handleModelChange: SelectProps<Model["sha256"] | string>["onChange"] =
    useCallback(
      (value) => {
        if (value) setModel(value);
      },
      [setModel]
    );

  const handleModelRefreshClick = (e: MouseEvent) => {
    e.preventDefault();
    if (backend === "auto" || backend === "forge") refetchOptions();
    refetchModels();
  };

  const title = "Select Checkpoint";
  const name = "checkpoint";
  //TODO: fix types

  const groups = [
    {
      name: "Flux",
      matcher: (itemName) => /.*flux.*/i.test(itemName),
    },
    {
      name: "Pony",
      matcher: (itemName) => /.*pony.*/i.test(itemName),
    },
    {
      name: "SDXL",
      matcher: (itemName) => /.*(sd)?(\S)*xl.*/i.test(itemName),
    },
    {
      name: "SD 3.5",
      matcher: (itemName) => /.*3\.?5.*/i.test(itemName),
    },
  ];

  return (
    <>
      <div className={twMerge("inline-flex w-full", className)}>
        {backend === "auto" || backend === "forge" ? (
          <Select
            id="auto_model"
            items={models}
            textAttr="model_name"
            valueAttr="model_name"
            idAttr="model_name"
            name={name}
            value={selectedModel?.model_name || selectedModel?.name}
            onChange={handleModelChange}
            title={title}
            disabled={isModelLoading || isVaeLoading}
            shouldSetDefaultValue={false}
            groups={groups}
          />
        ) : (
          <Select
            id="comfy_model"
            items={models}
            name={name}
            value={selectedModel?.model_name || selectedModel?.name}
            onChange={handleModelChange}
            title={title}
            groups={groups}
            shouldSetDefaultValue={shouldSetDefaultValue}
          />
        )}
        <Button
          variant="clear"
          onClick={handleModelRefreshClick}
          className="rounded-tl-none rounded-bl-none !p-2"
          title="Refresh"
        >
          <ReloadIcon />
        </Button>
      </div>
    </>
  );
};
export const VaeSelect = ({
  refetchOptions,
  vaes,
  setVae,
  refetchVaes,
  selectedVae,
  isVaeLoading,
  isModelLoading,
  className = "",
  selectedModel: selectedModelOverride,
  shouldSetDefaultValue,
}: {
  refetchOptions: () => void;
  vaes;
  setVae;
  refetchVaes;
  selectedVae;
  isVaeLoading: boolean;
  isModelLoading: boolean;
  className?: string;
  selectedModel?: ReturnType<typeof selectSelectedModel>;
  shouldSetDefaultValue?: boolean;
}) => {
  const backend = useAppSelector(selectBackend);
  const stateSelectedModel = useAppSelector(selectSelectedModel);

  const selectedModel = selectedModelOverride ?? stateSelectedModel;

  const handleVaeChange: SelectProps["onChange"] = useCallback(
    (value) => {
      if (value && (selectedVae || backend === "comfy" || backend === "forge"))
        setVae(value);
    },
    [backend, selectedVae, setVae]
  );

  const handleModelRefreshClick = (e: MouseEvent) => {
    e.preventDefault();
    refetchOptions();
    refetchVaes();
  };

  const title = "Select VAE";
  const name = "vae";

  const vaeList = useMemo(
    () =>
      backend === "forge"
        ? [
            ...(!selectedModel?.isFlux
              ? [{ model_name: "Automatic", filename: "automatic" }]
              : []),
            ...(vaes ?? []),
          ]
        : [...(!selectedModel?.isFlux ? ["Automatic"] : []), ...(vaes ?? [])],
    [backend, selectedModel?.isFlux, vaes]
  );

  return (
    <>
      <div className={twMerge("inline-flex w-full", className)}>
        {backend === "auto" || backend === "forge" ? (
          <Select
            id="auto_vae"
            items={vaeList}
            name={name}
            {...(backend === "forge" && {
              textAttr: "model_name",
              valueAttr: "filename",
            })}
            value={selectedVae}
            onChange={handleVaeChange}
            title={title}
            disabled={isVaeLoading || isModelLoading}
            shouldSetDefaultValue={shouldSetDefaultValue}
          />
        ) : (
          <Select
            id="comfy_vae"
            items={vaeList}
            name={name}
            value={selectedVae}
            onChange={handleVaeChange}
            title={title}
          />
        )}
        <Button
          variant="clear"
          onClick={handleModelRefreshClick}
          className="rounded-tl-none rounded-bl-none !p-2"
          title="Refresh"
        >
          <ReloadIcon />
        </Button>
      </div>
    </>
  );
};
