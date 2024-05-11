import { useCallback, useMemo } from "react";
import { Scripts } from "../App.d";
import useData, { FetchPolicy } from "./useData";
import { useAppSelector } from "../hooks";
import { selectBackend } from "../state/optionsSlice";

type Props = {
  fetchPolicy?: FetchPolicy;
};
type Return = {
  scripts: Scripts;
  fetchData: ReturnType<typeof useData>["fetchData"];
  hasTiledDiffusion: boolean;
  hasTiledVae: boolean;
  hasUltimateUpscale: boolean;
  hasControlnet: boolean;
  hasSelfAttentionGuidance: boolean;
  hasSoftInpainting: boolean;
  hasRegionalPrompting: boolean;
  hasNeverOutOfMemory: boolean;
  hasMultidiffusionIntegrated: boolean;
};

const useScripts = ({ fetchPolicy }: Props = {}): Return => {
  const { fetchData, data: scripts } = useData<Scripts>({
    name: "scripts",
    fetchPolicy,
  });

  const backend = useAppSelector(selectBackend);

  const hasScript = useCallback(
    (scriptName: string) => {
      return (
        (scripts?.txt2img?.includes(scriptName) ||
          scripts?.img2img?.includes(scriptName)) ??
        false
      );
    },
    [scripts]
  );
  const hasTiledDiffusion = useMemo(
    () => (backend === "auto" ? hasScript("tiled diffusion") : false),
    [backend, hasScript]
  );
  const hasTiledVae = useMemo(
    () => (backend === "auto" ? hasScript("tiled vae") : false),
    [backend, hasScript]
  );
  const hasUltimateUpscale = useMemo(
    () => (backend === "auto" ? hasScript("ultimate sd upscale") : true),
    [backend, hasScript]
  );
  const hasControlnet = useMemo(
    () => (backend === "auto" ? hasScript("controlnet") : true),
    [backend, hasScript]
  );
  const hasSelfAttentionGuidance = useMemo(
    () => (backend === "auto" ? hasScript("self attention guidance") : false),
    [backend, hasScript]
  );

  const hasSoftInpainting = useMemo(
    () => (backend === "auto" ? hasScript("soft inpainting") : false),
    [backend, hasScript]
  );
  const hasForgeCouple = useMemo(
    () => (backend === "auto" ? hasScript("forge couple") : false),
    [backend, hasScript]
  );
  const hasNeverOutOfMemory = useMemo(
    () => (backend === "auto" ? hasScript("never oom integrated") : false),
    [backend, hasScript]
  );
  const hasMultidiffusionIntegrated = useMemo(
    () => (backend === "auto" ? hasScript("multidiffusion integrated") : false),
    [backend, hasScript]
  );

  return {
    scripts,
    fetchData,
    hasTiledDiffusion,
    hasTiledVae,
    hasUltimateUpscale,
    hasControlnet,
    hasSelfAttentionGuidance,
    hasSoftInpainting,
    hasRegionalPrompting: hasForgeCouple || backend === "comfy",
    hasNeverOutOfMemory,
    hasMultidiffusionIntegrated,
  };
};

export default useScripts;
