import { useCallback } from "react";
import Select, { SelectProps } from "../components/Select";
import useBackend from "../hooks/useBackend";

type Props = {
  clipModels: string[];
  selectedClipModels?: string[];
  setClipModels: (clipModel: string[]) => void;
  className?: string;
};

const ClipModelMultiSelect = ({
  clipModels,
  selectedClipModels,
  setClipModels,
  className = "",
}: Props) => {
  const { backend } = useBackend();

  const handleClipModelChange: SelectProps["onChange"] = useCallback(
    (value) => {
      if (
        value &&
        (selectedClipModels || backend === "comfy" || backend === "forge")
      )
        setClipModels(value as string[]);
    },
    [backend, selectedClipModels, setClipModels]
  );

  if (backend !== "comfy" && backend !== "forge") return null;

  const title = "Select Text Encoders";

  return (
    <Select
      id="comfy_vae"
      className={className}
      items={clipModels}
      name={name}
      value={selectedClipModels}
      onChange={handleClipModelChange}
      title={title}
      shouldSetDefaultValue={false}
      placeholder="Select Text Encoders"
      multiple
    />
  );
};

export default ClipModelMultiSelect;
