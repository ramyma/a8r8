import { useCallback, useEffect, useMemo, useState } from "react";
import { Scripts } from "../App.d";
import { useAppDispatch, useAppSelector } from "../hooks";
import { selectSelectedModel, setSelectedModel } from "../state/optionsSlice";
import useData, { FetchPolicy } from "./useData";
import useSocket from "./useSocket";

type Props = {
  fetchPolicy?: FetchPolicy;
};

const useScripts = ({ fetchPolicy }: Props = {}) => {
  const { fetchData, data: scripts } = useData<Scripts>({
    name: "scripts",
    fetchPolicy,
  });

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
    () => hasScript("tiled diffusion"),
    [hasScript]
  );
  const hasTiledVae = useMemo(() => hasScript("tiled vae"), [hasScript]);
  const hasControlnet = useMemo(() => hasScript("controlnet"), [hasScript]);
  const hasSelfAttentionGuidance = useMemo(
    () => hasScript("self attention guidance"),
    [hasScript]
  );

  return {
    scripts,
    fetchData,
    hasTiledDiffusion,
    hasTiledVae,
    hasControlnet,
    hasSelfAttentionGuidance,
  };
};

export default useScripts;
