import React, { useEffect } from "react";
import { Model } from "./App.d";
import useModels from "./hooks/useModels";
import useOptions from "./hooks/useOptions";

const ModelsModal = () => {
  const { isModelLoading, models, setModel, selectedModel } = useModels();
  console.log(selectedModel);

  // const selectedModel = "";

  return (
    <div className="fixed w-screen h-screen bg-black bg-opacity-70 backdrop-blur-sm  align-middle justify-center items-center text-center  overflow-y-auto">
      <div className="relative w-2/3 h-2/3  bg-[#121212] rounded grid grid-cols-3 gap-4 p-8">
        {models?.map((model) => (
          <button
            key={model.title}
            className={`select-none rounded bg-slate-500 w-full h-44 overflow-hidden ${
              selectedModel === model.sha256
                ? "border-red-300 border-2"
                : "hover:cursor-pointer"
            }`}
            onClick={() => setModel(model?.sha256)}
          >
            <span>{model.model_name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ModelsModal;
