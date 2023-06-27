import React, { MouseEvent } from "react";
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
import Select from "./components/Select";
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
function App() {
  const { refetch: refetchOptions } = useOptions({ fetchPolicy: "eager" });
  useSamplers({ fetchPolicy: "eager" });
  useMemoryStats({ fetchPolicy: "eager" });

  useClipboard({ emit: true });
  useDragAndDrop({ emit: true });

  useHistoryManager();

  useControlnet({
    fetchPolicy: "eager",
  });

  // TODO: Capture reload and window close to prevent losing the working session

  const {
    isModelLoading,
    models,
    setModel,
    selectedModel,
    fetchData: refetchModels,
  } = useModels({
    fetchPolicy: "eager",
  });

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

  useIsConnected();

  // const handleModelChange = async (e: ChangeEvent<HTMLSelectElement>) => {
  //   const hashValue: Model["sha256"] = e.target.value;
  //   setModel(hashValue);
  // };

  const handleModelChange = (value: Model["sha256"]) => {
    setModel(value);
  };

  const handleModelRefreshClick = (e: MouseEvent) => {
    e.preventDefault();
    refetchOptions();
    refetchModels();
  };
  return (
    <div className="relative App w-screen h-screen m-0 p-0 bg-[#0d0d0d] overflow-hidden">
      <div className="relative flex h-full w-full ">
        <div className="absolute left-0 top-0 max-w-[15vw] md:w-[17vw] flex flex-1 h-full bg-black/90 backdrop-blur-sm flex-col z-10">
          <ScrollArea>
            <div className="flex p-4 px-6">
              {/* <Select
              items={models}
              idAttr="model_name"
              textAttr="model_name"
              valueAttr="sha256"
              value={selectedModel}
            /> */}
              {/* <select
              className="w-full rounded rounded-tr-none rounded-br-none p-2"
              name="models"
              id="models"
              title="Select Checkpoint"
              value={selectedModel}
              onChange={handleModelChange}
              disabled={isModelLoading}
              >
              {models?.map((model) => (
                <option key={model.model_name} value={model.sha256}>
                {model.model_name}
                </option>
                ))}
            </select> */}
              <Select
                items={models}
                textAttr="model_name"
                valueAttr="sha256"
                idAttr="model_name"
                name="checkpoint"
                value={selectedModel}
                onChange={handleModelChange}
                title="Select Checkpoint"
                disabled={isModelLoading}
              />
              <button
                onClick={handleModelRefreshClick}
                className="rounded rounded-tl-none rounded-bl-none p-2"
                title="Refresh"
              >
                <ReloadIcon />
              </button>
            </div>
            <MainForm />
          </ScrollArea>
          {/* <div>
            <button
            onClick={(e) => {
              console.log(e);
              // imageLayerRef?.current.cache();
            }}
            >
              Save
            </button>
          </div> */}
        </div>
        <div className="flex-[9] relative w-full">
          <Stats />
          <Canvas />
          <Toolbar />
        </div>
        <LayersControl />
        <Notifications />
        {/* <ModelsModal /> */}
      </div>
    </div>
  );
}
export default App;
