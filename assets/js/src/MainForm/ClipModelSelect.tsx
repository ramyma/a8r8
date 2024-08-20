import { useCallback } from "react";
import Select, { SelectProps } from "../components/Select";
import useBackend from "../hooks/useBackend";

type Props = {
  clipModels: string[];
  selectedClipModel?: string;
  setClipModel: (clipModel: string) => void;
};

const ClipModelSelect = ({
  clipModels,
  selectedClipModel,
  setClipModel,
}: Props) => {
  const { backend } = useBackend();

  const handleClipModelChange: SelectProps["onChange"] = useCallback(
    (value) => {
      if (value && (selectedClipModel || backend === "comfy"))
        setClipModel(value as string);
    },
    [backend, selectedClipModel, setClipModel]
  );

  if (backend !== "comfy") return null;

  const title = "Select Clip Model";

  return (
    <Select
      id="comfy_vae"
      items={clipModels}
      name={name}
      value={selectedClipModel}
      onChange={handleClipModelChange}
      title={title}
    />
  );
};

export default ClipModelSelect;
