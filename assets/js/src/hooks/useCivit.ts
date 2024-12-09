import useSocket from "./useSocket";

export type CivitModel = {
  baseModel: string;
  baseModelType: string;
  createdAt: string;
  description: string | null;
  downloadUrl: string;
  earlyAccessTimeFrame: number;
  files: {
    downloadUrl: string;
    hashes: {
      AutoV1: string;
      AutoV2: string;
      AutoV3: string;
      BLAKE3: string;
      CRC32: string;
      SHA256: string;
    };
    id: number;
    metadata: {
      format: "SafeTensor";
      // "fp": null,
      // "size": null
    };
    name: string;
    pickleScanMessage: string;
    pickleScanResult: string;
    primary: boolean;
    scannedAt: string;
    sizeKB: number;
    type: string;
    // "virusScanMessage": null,
    // "virusScanResult": "Success"
  }[];
  id: number;
  images: {
    availability: "Public";
    hash: string;
    height: number;
    meta: {
      '"add-detail-xl': string;
      Model: string;
      "Model hash": string;
      Script: string;
      Size: string; //"896x1024";
      Version: string;
      //   "X Type": "Prompt S/R";
      //   "add-detail-xl": '1>"';
      cfgScale: 7;
      hashes: {
        model: string;
      };
      prompt: string;
      negativePrompt: string;
      resources: {
        hash: string;
        name: string;
        type: "model";
      }[];
      sampler: string;
      seed: number;
      steps: number;
    };
    metadata: {
      hash: string;
      height: number;
      size: number;
      width: number;
    };
    nsfwLevel: number;
    type: "image" | "video";
    url: string;
    width: number;
  }[];
  model: {
    name: string;
    nsfw: boolean;
    poi: boolean;
    type: "LORA";
  };
  modelId: number;
  name: string;
  publishedAt: string;
  stats: {
    downloadCount: number;
    rating: number;
    ratingCount: number;
    thumbsUpCount: number;
  };
  status: "Published";
  trainedWords: string[];
  trainingDetails: null;
  trainingStatus: null;
  updatedAt: string;
};

const useCivit = () => {
  const { sendCivitMessageAndReceive } = useSocket();
  const getModelByHash = (hash: string, path: string) =>
    sendCivitMessageAndReceive<CivitModel>("civit_get_model_by_hash", {
      hash,
      path,
    });
  return {
    getModelByHash,
  };
};

export default useCivit;
