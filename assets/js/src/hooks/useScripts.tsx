import { useCallback, useMemo } from "react";
import { Scripts } from "../App.d";
import useData, { FetchPolicy } from "./useData";
import { useAppSelector } from "../hooks";
import { selectBackend, selectSelectedModel } from "../state/optionsSlice";

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
  const selectedModel = useAppSelector(selectSelectedModel);

  const isFlux = selectedModel?.isFlux;

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
    () =>
      backend === "auto" || backend === "forge"
        ? hasScript("ultimate sd upscale")
        : true,
    [backend, hasScript]
  );
  const hasControlnet = useMemo(
    () =>
      backend === "auto" || backend === "forge"
        ? hasScript("controlnet")
        : !isFlux,
    [backend, hasScript, isFlux]
  );
  const hasSelfAttentionGuidance = useMemo(
    () =>
      backend === "auto" || backend === "forge"
        ? hasScript("self attention guidance")
        : false,
    [backend, hasScript]
  );

  const hasSoftInpainting = useMemo(
    () => (backend === "auto" ? hasScript("soft inpainting") : false),
    [backend, hasScript]
  );
  const hasForgeCouple = useMemo(
    () =>
      backend === "auto" || backend === "forge"
        ? hasScript("forge couple")
        : false,
    [backend, hasScript]
  );
  const hasNeverOutOfMemory = useMemo(
    () => (backend === "forge" ? hasScript("never oom integrated") : false),
    [backend, hasScript]
  );
  const hasMultidiffusionIntegrated = useMemo(
    () =>
      backend === "forge" ? hasScript("multidiffusion integrated") : false,
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
    hasRegionalPrompting: hasForgeCouple || (backend === "comfy" && !isFlux),
    hasNeverOutOfMemory,
    hasMultidiffusionIntegrated,
  };
};

export default useScripts;
