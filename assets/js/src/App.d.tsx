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
  metadata: {
    ss_v2: "True" | "False";
    ss_tag_frequency: any;
  };
};

export type Sampler = string;

export type Options = {
  sd_checkpoint_hash: string;
  sd_vae: string;
};

export type MemoryStats = {
  ram_usage: number;
  cuda_usage: number;
};

export type Scripts = {
  txt2img: string[];
  img2img: string[];
};
