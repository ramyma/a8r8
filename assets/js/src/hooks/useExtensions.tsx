import useData, { FetchPolicy } from "./useData";
import { useAppSelector } from "../hooks";
import { selectBackend } from "../state/optionsSlice";

type Props = {
  fetchPolicy?: FetchPolicy;
};
type ComfyExtension = {
  enabled: boolean;
  /**
   * Repo name
   */
  aux_id: string;
  /**
   * Name
   */
  cnr_id: string;
  /**
   * Version
   */
  ver: string;
};
type Return = {
  fetchData: ReturnType<typeof useData>["fetchData"];
  extensions?: Record<string, ComfyExtension>;
  comfyManagerStatus: "processing" | "error" | "idle" | "success";
};

const useExtensions = ({ fetchPolicy }: Props = {}): Return => {
  const backend = useAppSelector(selectBackend);

  const { fetchData, data: extensions } = useData<Return["extensions"]>({
    name: "extensions",
    fetchPolicy,
    async: false,
    condition: backend === "comfy",
  });

  const { data: comfyManagerStatus } = useData<Return["comfyManagerStatus"]>({
    name: "comfy_manager_status",
    fetchPolicy,
    condition: backend === "comfy",
    callback: (status) => {
      if (status === "success" || status === "error") {
        fetchData();
      }
    },
  });

  return { fetchData, extensions, comfyManagerStatus };
};

export default useExtensions;
