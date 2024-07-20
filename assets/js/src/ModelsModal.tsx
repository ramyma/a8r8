import useModels from "./hooks/useModels";
import Modal, { ModalProps } from "./components/Modal";
import useGlobalKeydown from "./hooks/useGlobalKeydown";
import Button from "./components/Button";
import Input from "./components/Input";

const ModelsModal = (props: ModalProps) => {
  const { isModelLoading, models, setModel, selectedModel } = useModels();

  useGlobalKeydown({
    handleKeydown: (event) => {
      if (event.key === "Escape") props.onClose(event);
    },
    override: true,
  });

  return (
    <Modal
      {...props}
      className={
        "flex flex-col justify-between gap-4 items-baseline " + props.className
      }
    >
      <Input autoFocus className="p-2 w-[33%]" />
      <div className=" align-middle justify-center items-center text-center grid grid-cols-3 gap-5">
        {models?.map((model) => (
          <Button
            key={model.title}
            className={`p-4 text-sm text-wrap select-none rounded bg-neutral-800/70 border border-neutral-700 w-full h-44 overflow-hidden place-items-center   ease-in-out duration-300 transition-all ${
              selectedModel.hash === model.sha256
                ? "border-primary border-2 cursor-auto bg-neutral-700/70 pointer-events-none"
                : "hover:cursor-pointer"
            } ${isModelLoading ? "cursor-wait" : ""}`}
            onClick={() =>
              selectedModel.hash !== model.sha256 && setModel(model?.sha256)
            }
            disabled={isModelLoading}
          >
            {model.model_name}
          </Button>
        ))}
      </div>
    </Modal>
  );
};

export default ModelsModal;
