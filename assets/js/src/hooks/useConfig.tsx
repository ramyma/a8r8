import useData, { FetchPolicy } from "./useData";
import { emitCustomEvent } from "react-custom-events";

type Props = {
  fetchPolicy?: FetchPolicy;
};

export type AppConfig = {
  last_gen_config: {
    prompt?: string;
    negative_prompt?: string;
    scheduler?: string;
    txt2img: boolean;
    sampler_name?: string;
    steps: number;
    cfg_scale: number;
    width: number;
    height: number;
    seed: number;
    flux_guidance: number;
    batch_size: number;
    scale: number;
    use_scaled_dimensions: boolean;
    full_scale_pass: boolean;
    model?: string;
    vae?: string;
    clip_skip?: string;
    clip_model?: string;
    clip_model_2?: string;
  };
};

const useConfig = ({ fetchPolicy }: Props = {}) => {
  const { fetchData, data: config } = useData<AppConfig>({
    name: "config",
    fetchPolicy,
    callback: (data) => {
      emitCustomEvent("apply-preset", data?.last_gen_config);
    },
  });

  return { config, fetchData };
};

export default useConfig;
