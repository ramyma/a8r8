import Select from "./components/Select";
import { useAppSelector } from "./hooks";
import useBackend from "./hooks/useBackend";
import { selectBackend } from "./state/optionsSlice";
import { selectIsGenerating } from "./state/statsSlice";

const BackendSelect = () => {
  const backend = useAppSelector(selectBackend);
  const { changeBackend } = useBackend();
  const handleBackendChange = (backend) => {
    changeBackend(backend);
  };

  const isGenerating = useAppSelector(selectIsGenerating);

  return (
    <Select
      className="w-fit!"
      items={[
        { label: "A1111", value: "auto" },
        { label: "Forge", value: "forge" },
        { label: "Comfy", value: "comfy" },
      ]}
      title="Select Backend"
      value={backend}
      disabled={isGenerating}
      onChange={handleBackendChange}
    />
  );
};

export default BackendSelect;
