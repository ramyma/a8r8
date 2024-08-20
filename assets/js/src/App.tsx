import { MouseEvent, useCallback, useMemo } from "react";
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
import { ReloadIcon } from "@radix-ui/react-icons";
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
import ClipModelSelect from "./MainForm/ClipModelSelect";

function App() {
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

  useBackend({
    fetchPolicy: "eager",
  });

  const {
    isModelLoading,
    isVaeLoading,
    models,
    setModel,
    setVae,
    setClipModel,
    setClipModel2,
    selectedModel,
    selectedVae,
    selectedClipModel,
    selectedClipModel2,
    fetchData: refetchModels,
    fetchVaes: refetchVaes,
    vaes,
    clipModels,
  } = useModels({
    fetchPolicy: "eager",
  });

  useIsConnected();
  // const panelRef = useRef<HTMLDivElement>(null);
  // const { width } = useResize({ container: panelRef });

  // console.log({ width });

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

  return (
    <div className="relative App w-screen h-screen m-0 p-0 bg-[#0d0d0d] overflow-hidden">
      <div className="relative flex h-full w-full ">
        <div
          // ref={panelRef}
          className="absolute left-0 top-0 max-w-[20vw] md:w-[17vw] lg:w-[33vw] flex flex-1 h-full bg-black/90 backdrop-blur-sm flex-col z-10 transition-all"
        >
          <ScrollArea>
            <div className="flex p-4 px-6 flex-col gap-2">
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
              {selectedModel?.isFlux && (
                <>
                  <ClipModelSelect
                    clipModels={clipModels}
                    setClipModel={setClipModel}
                    selectedClipModel={selectedClipModel}
                  />
                  <ClipModelSelect
                    clipModels={clipModels}
                    setClipModel={setClipModel2}
                    selectedClipModel={selectedClipModel2}
                  />
                </>
              )}
            </div>
            <MainForm />
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
        {/* <ModelsModal /> */}
      </div>
    </div>
  );
}
export default App;
const ModelSelect = ({
  refetchOptions,
  models,
  setModel,
  refetchModels,
  selectedModel,
  isModelLoading,
  isVaeLoading,
}: {
  refetchOptions: () => void;
  models: Model[];
  setModel;
  refetchModels;
  selectedModel: OptionsState["selectedModel"];
  isModelLoading: boolean;
  isVaeLoading: boolean;
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
    if (backend === "auto") refetchOptions();
    refetchModels();
  };

  const title = "Select Checkpoint";
  const name = "checkpoint";
  //TODO: fix types
  return (
    <>
      <div className="inline-flex w-full">
        {backend === "auto" ? (
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
          />
        ) : (
          <Select
            id="comfy_model"
            items={models}
            name={name}
            value={selectedModel?.model_name || selectedModel?.name}
            onChange={handleModelChange}
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
const VaeSelect = ({
  refetchOptions,
  vaes,
  setVae,
  refetchVaes,
  selectedVae,
  isVaeLoading,
  isModelLoading,
}: {
  refetchOptions: () => void;
  vaes;
  setVae;
  refetchVaes;
  selectedVae;
  isVaeLoading: boolean;
  isModelLoading: boolean;
}) => {
  const backend = useAppSelector(selectBackend);
  const selectedModel = useAppSelector(selectSelectedModel);

  const handleVaeChange: SelectProps["onChange"] = useCallback(
    (value) => {
      if (value && (selectedVae || backend === "comfy")) setVae(value);
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
    () => [...(!selectedModel?.isFlux ? ["Automatic"] : []), ...(vaes ?? [])],
    [selectedModel, vaes]
  );

  return (
    <>
      <div className="inline-flex w-full">
        {backend === "auto" ? (
          <Select
            id="auto_vae"
            items={vaeList}
            name={name}
            value={selectedVae}
            onChange={handleVaeChange}
            title={title}
            disabled={isVaeLoading || isModelLoading}
            shouldSetDefaultValue={false}
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
