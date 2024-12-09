export type ModelType = "sd1.5" | "sdxl" | "sd3.5" | "pony" | "flux";

export type Model = {
  title: string;
  model_name: string;
  hash: string;
  sha256: string;
  filename: string;
  config: string;
};

export type Vae = {
  model_name: string;
  filename: string;
};

export type Lora = {
  alias: string;
  name: string;
  path: string;
  stored_metadata: {
    baseModel: string;
    images: {
      type: "image" | "video";
      url: string;
      nsfwLevel: number;
    }[];
    trainedWords: string[];
    model: {
      name: string;
      nsfw: boolean;
    };
  };
  metadata: {
    baseModel: string;
    ss_v2?: "True" | "False";
    ss_tag_frequency?: any;
    ss_sd_scripts_commit_hash: string;
    sshs_model_hash: string;
    ss_resolution: string;
    sshs_legacy_hash: string;
    ss_base_model_version: string;
    ss_clip_skip: number;
    ss_new_sd_model_hash: string;
    ss_output_name: string;
    ss_network_module: "networks.lora" | "networks.loha";
    ss_sd_model_name: string;
  };
  model_type: ModelType;
};

export type Sampler = string;

export type Options = {
  sd_checkpoint_hash: string;
  sd_vae: string;
  forge_additional_modules?: string[];
};

export type MemoryStats = {
  ram_usage: number;
  cuda_usage: number;
};

export type Scripts = {
  txt2img: string[];
  img2img: string[];
};
