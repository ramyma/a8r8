import {
  ChangeEvent,
  KeyboardEventHandler,
  MouseEvent,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Controller, SubmitHandler, useForm, useWatch } from "react-hook-form";
// import { DevTool } from "@hookform/devtools";
import { FormProvider } from "react-hook-form";

import useSocket from "../hooks/useSocket";
import RefsContext from "../context/RefsContext";

import { useAppDispatch, useAppSelector } from "../hooks";
import {
  DEFAULT_HEIGHT_VALUE,
  DEFAULT_WIDTH_VALUE,
  selectSelectionBox,
  updateSelectionBox,
} from "../state/selectionBoxSlice";
import useSamplers from "../hooks/useSamplers";
import {
  ControlnetLayer,
  selectControlnetLayers,
} from "../state/controlnetSlice";
import { selectIsConnected, selectIsGenerating } from "../state/statsSlice";
import Checkbox from "../components/Checkbox";
import { selectIsMaskLayerVisible } from "../state/layersSlice";
import Slider from "../components/Slider";
import useGlobalKeydown from "../hooks/useGlobalKeydown";
import useClipboard from "../hooks/useClipboard";
import useDragAndDrop from "../hooks/useDragAndDrop";
import {
  editorJsonToText,
  getLayers,
  roundToClosestMultipleOf8Down,
  checkIsIpAdapterControlnetModel,
} from "../utils";
import Editor from "../components/Editor";

import useUpscalers from "../hooks/useUpsclaers";
import { EditorState } from "prosemirror-state";
import Select from "../components/Select";
import Input from "../components/Input";
import Label from "../components/Label";
import Txt2ImageButtonGroup from "./Txt2ImgButtonGroup";
import { sessionName } from "../context/SocketProvider";
import Toggle from "../components/Toggle";
import { LockClosedIcon, LockOpen2Icon } from "@radix-ui/react-icons";
import {
  selectBatchImageResults,
  selectInvertMask,
  setBatchImageResults,
} from "../state/canvasSlice";
import useScripts from "../hooks/useScripts";
import {
  selectBackend,
  selectSelectedClipModels,
  selectSelectedModel,
  selectSelectedVae,
} from "../state/optionsSlice";
import useSchedulers from "../hooks/useSchedulers";
import SoftInpaintingFields, {
  SoftInpaintingArgs,
} from "./SoftInpaintingFields/SoftInpaintingFields";
import RegionalPromptsFields from "./RegionalPromptsFields";
import { processPrompt } from "./utils";
import { REGIONAL_PROMPTS_SEPARATOR, weightTypesByName } from "./constants";
import { selectPromptRegionLayers } from "../state/promptRegionsSlice";
import { showNotification } from "../Notifications/utils";
import Button from "../components/Button";
import { emitCustomEvent, useCustomEventListener } from "react-custom-events";
import ComfySoftInpaintingFields from "./ComfySoftInpaintingFields";
import { ComfySoftInpaintingArgs } from "./ComfySoftInpaintingFields";
import SkimmedCfgFields from "./SkimmedCfgFields";
import { SkimmedCfgArgs } from "./SkimmedCfgFields/SkimmedCfgFields";
import SplitRenderFields from "./SplitRenderFields";
import { SplitRenderArgs } from "./SplitRenderFields/SplitRenderFields";
import LorasModal from "../LorasModal";
import { selectLoras } from "../state/lorasSlice";
import LorasSection from "./LorasSection";
import useModels from "../hooks/useModels";
import useLoras from "../hooks/useLoras";

export type MainFormValues = Record<string, any> & {
  clip_skip: number;
  prompt: string | EditorState;
  negative_prompt: string | EditorState;
  sampler_name: string;
  scheduler: string;
  denoising_strength?: number;
  width: number;
  height: number;
  scale: number;
  steps: number;
  seed: number;
  isSeedPinned: boolean;
  inpainting_fill?: string;
  fooocus_inpaint?: boolean;
  isSelfAttentionGuidanceEnabled?: boolean;
  upscaler?: string;
  batch_size: number;
  softInpainting: SoftInpaintingArgs;
  comfySoftInpainting: ComfySoftInpaintingArgs;
  sp_denoising_strength?: number;
  regionalPrompts?: Record<string, { prompt: EditorState; weight }>;
  globalPromptWeight?: number;
  skimmedCfg: SkimmedCfgArgs;
  splitRender: SplitRenderArgs;
  cfg_scale: number;
  flux_guidance: number;
  isTiledDiffusionEnabled: boolean;
  isRegionalPromptingEnabled: boolean;
  txt2img: boolean;
  isUltimateUpscaleEnabled: boolean;
  isMultidiffusionEnabled: boolean;
  full_scale_pass: boolean;
  use_scaled_dimensions: boolean;
};

const MainForm = () => {
  const { channel, sendMessage, broadcastSelectionBoxUpdate } = useSocket();
  const backend = useAppSelector(selectBackend);
  const addedLoras = useAppSelector(selectLoras);
  const { loras } = useLoras();
  const batchImageResults = useAppSelector(selectBatchImageResults);
  const methods = useForm<MainFormValues>({ shouldUnregister: false });
  const { control, handleSubmit, setValue } = methods;
  const formRef = useRef<HTMLFormElement>(null);
  const scale = useWatch({ name: "scale", control, defaultValue: 1 });
  const width = useWatch({ name: "width", control });
  const height = useWatch({ name: "height", control });
  const txt2img = useWatch({ name: "txt2img", control, defaultValue: true });
  const isSeedPinned = useWatch({ name: "isSeedPinned", control });
  const seed = useWatch({ name: "seed", control });
  const batchSize = useWatch({ name: "batch_size", control, defaultValue: 1 });

  const fullScalePass = useWatch({
    name: "full_scale_pass",
    control,
    defaultValue: true,
  });
  const isUltimateUpscaleEnabled = useWatch({
    name: "isUltimateUpscaleEnabled",
    control,
    defaultValue: false,
  });

  const isTiledDiffusionEnabled = useWatch({
    name: "isTiledDiffusionEnabled",
    control,
    defaultValue: false,
  });

  const isMultidiffusionEnabled = useWatch({
    name: "isMultidiffusionEnabled",
    control,
    defaultValue: false,
  });

  const isRegionalPromptingEnabled = useWatch({
    name: "isRegionalPromptingEnabled",
    control,
    defaultValue: false,
  });

  const upscaler = useWatch({
    name: "upscaler",
    control,
    defaultValue: "None",
  });

  const {
    hasSelfAttentionGuidance,
    hasTiledDiffusion,
    hasUltimateUpscale,
    hasTiledVae,
    hasControlnet,
    hasSoftInpainting,
    hasRegionalPrompting,
    hasMultidiffusionIntegrated,
  } = useScripts();

  const isA1111 = backend === "auto" && !hasMultidiffusionIntegrated;
  const isForge = backend === "forge";

  const { upscalers } = useUpscalers();

  const sortedUpscalers = useMemo(
    () => [
      "None",
      ...((!hasTiledDiffusion || !isTiledDiffusionEnabled) &&
      (txt2img || (backend == "comfy" && !isUltimateUpscaleEnabled))
        ? ["Latent"]
        : []),
      ...[...(upscalers ?? [])].sort(),
    ],
    [
      hasTiledDiffusion,
      isTiledDiffusionEnabled,
      txt2img,
      backend,
      isUltimateUpscaleEnabled,
      upscalers,
    ]
  );

  const model = useAppSelector(selectSelectedModel);
  const vae = useAppSelector(selectSelectedVae);

  const clipModels = useAppSelector(selectSelectedClipModels);

  const isConnected = useAppSelector(selectIsConnected);

  const isBatchDisabled =
    (hasTiledDiffusion && isTiledDiffusionEnabled) ||
    (!txt2img && hasUltimateUpscale && isUltimateUpscaleEnabled) ||
    (hasMultidiffusionIntegrated && isMultidiffusionEnabled);

  const handleAddImage = ({ pngInfo }) => {
    if (pngInfo) {
      const {
        prompt,
        negativePrompt,
        sampler,
        seed,
        cfg_scale,
        denoising_strength,
        steps,
        // width,
        // height,
      } = pngInfo;
      setValue("prompt", prompt);
      setValue("negative_prompt", negativePrompt);
      setValue("sampler_name", sampler);
      setValue("seed", seed);
      setValue("denoising_strength", denoising_strength);
      setValue("cfg_scale", cfg_scale);

      setValue("steps", steps);
      // setValue("width", width);
      // setValue("height", height);
    }
  };

  useClipboard({ handleAddImage });
  useDragAndDrop({ handleAddImage });

  const refs = useContext(RefsContext);
  const { selectionBoxRef, canvasContainerRef } = refs;

  const { selectedModel, loadModelConfig } = useModels();

  const [prevSelectedModel, setPrevSelectedModel] =
    useState<typeof selectedModel>();

  const applyModelConfig = async () => {
    const modelConfig = await loadModelConfig(selectedModel.name);
    if (modelConfig) emitCustomEvent("apply-preset", modelConfig);
  };

  if (selectedModel !== prevSelectedModel) {
    setPrevSelectedModel(selectedModel);
    applyModelConfig();
  }

  // apply last gen config
  useCustomEventListener("apply-preset", (params: Partial<MainFormValues>) => {
    params?.clip_skip && setValue("clip_skip", params.clip_skip);
    params?.cfg_scale && setValue("cfg_scale", params.cfg_scale);
    params?.flux_guidance && setValue("flux_guidance", params.flux_guidance);
    params?.sampler_name && setValue("sampler_name", params.sampler_name);
    params?.scheduler && setValue("scheduler", params.scheduler);
    params?.steps && setValue("steps", params.steps);

    if (params?.width && params?.height && canvasContainerRef?.current) {
      const width = params.width;
      const height = params.height;

      // const x = roundToClosestMultipleOf8(
      //   Math.floor(
      //     canvasContainerRef?.current.clientWidth / 2 - params.width / 2
      //   )
      // );
      // const y = roundToClosestMultipleOf8(
      //   Math.floor(
      //     canvasContainerRef?.current.clientHeight / 2 - params.height / 2
      //   )
      // );

      dispatch(
        updateSelectionBox({
          width,
          height,
          // ...(canvasContainerRef?.current && {
          //   x,
          //   y,
          // }),
        })
      );
      broadcastSelectionBoxUpdate({
        width,
        height,
      });
    }
    params?.scale && setValue("scale", params.scale);
  });

  const selectionBox = useAppSelector(selectSelectionBox);
  const dispatch = useAppDispatch();

  const controlnetLayersArgs = useAppSelector(selectControlnetLayers);
  const isGenerating = useAppSelector(selectIsGenerating);

  const isMaskLayerVisible = useAppSelector(selectIsMaskLayerVisible);

  const promptRegions = useAppSelector(selectPromptRegionLayers);

  useEffect(() => {
    const { width: selectionBoxWidth, height: selectionBoxHeight } =
      selectionBox;
    if (width !== selectionBoxWidth) setValue("width", selectionBoxWidth);
    if (height !== selectionBoxHeight) setValue("height", selectionBoxHeight);
  }, [height, selectionBox, setValue, width]);

  const prevMinDimension = useRef<number>();
  useEffect(() => {
    // Update scale if either width of height go below 512
    if (width && height) {
      const referenceDim =
        model.isSdXl || model.isFlux || model.isSd35 ? 1024 : 512;

      const minDimension = Math.min(+width, +height);

      if (minDimension < referenceDim) {
        const newScale = Math.min(
          10,
          (model?.isSdXl || model?.isFlux || model.isSd35 ? 1024 : 516.5) /
            minDimension
        ).toFixed(2);
        setValue("scale", +newScale);
      } else if (
        prevMinDimension.current &&
        prevMinDimension.current < referenceDim
      ) {
        setValue("scale", 1);
      }
      prevMinDimension.current = minDimension;
    }
  }, [width, height, setValue, model]);

  const invertMask = useAppSelector(selectInvertMask);

  const onSubmit: SubmitHandler<MainFormValues> = async (data) => {
    const {
      maskDataUrl,
      initImageDataUrl,
      controlnetDataUrls,
      regionMasksDataUrls,
    } = await getLayers({
      refs,
      isMaskLayerVisible,
      controlnetLayersArgs,
      promptRegions,
    });

    const {
      batch_size: batchSize,
      clip_skip: clipSkip,
      scale,
      isSeedPinned,
      use_scaled_dimensions,
      full_scale_pass,
      isTiledDiffusionEnabled,
      isUltimateUpscaleEnabled,
      isSelfAttentionGuidanceEnabled,
      isRegionalPromptingEnabled,
      isMultidiffusionEnabled,
      upscaler,
      prompt,
      regionalPrompts,
      negative_prompt,
      scheduler,
      softInpainting,
      comfySoftInpainting,
      globalPromptWeight,
      fooocus_inpaint,
      splitRender,
      skimmedCfg,
      ...rest
    } = data;

    const {
      controlnetArgs,
      iPAdapters,
    }: Partial<ReturnType<typeof getControlnetArgs>> = hasControlnet
      ? getControlnetArgs()
      : {};
    const {
      basePrompt,
      processedPrompt,
      regionalPromptsWeights,
      regionalPromptsValues,
      regionalPromptsIds,
    } = processPrompt({
      prompt,
      regionalPrompts,
      isRegionalPromptingEnabled,
      promptRegions,
      loras,
      lorasState: addedLoras,
      backend,
    });

    // Show validation warning if prompt is not set with regional prompts
    if (
      (backend === "auto" || backend === "forge") &&
      hasRegionalPrompting &&
      !basePrompt &&
      isRegionalPromptingEnabled
    ) {
      showNotification({
        body: "Regional prompting requires a base prompt",
        title: "Missing Prompt",
        type: "warning",
      });
      return;
    }

    // Show validation warning if no prompt region is enabled with regional prompts
    if (
      backend === "comfy" &&
      hasRegionalPrompting &&
      isRegionalPromptingEnabled &&
      regionalPromptsValues?.length === 0
    ) {
      showNotification({
        body: "Regional prompting requires at least one active region",
        title: "Missing Prompt",
        type: "warning",
      });
      return;
    }

    const image = {
      prompt:
        hasRegionalPrompting &&
        isRegionalPromptingEnabled &&
        (backend === "auto" || backend === "forge")
          ? processedPrompt
          : basePrompt,
      negative_prompt:
        typeof (negative_prompt ?? "") === "string"
          ? prompt
          : editorJsonToText((negative_prompt as EditorState).doc.toJSON()),
      scheduler,
      ...rest,
      ...(!isSeedPinned && { seed: -1 }),
      mask: txt2img ? "" : maskDataUrl,
      init_images: txt2img
        ? hasControlnet &&
          controlnetArgs?.controlnet?.args.some(
            ({ overrideBaseLayer }) => !overrideBaseLayer
          )
          ? [initImageDataUrl]
          : []
        : [initImageDataUrl],
      enable_hr: scale > 1,
      hr_upscaler:
        (backend === "auto" || backend === "forge") && upscaler === "Latent"
          ? "Latent (nearest-exact)"
          : upscaler,
      hr_scale: scale,
      // seed_resize_from_w: rest.width,
      // seed_resize_from_h: rest.height,
      batch_size: isBatchDisabled ? 1 : batchSize,
      ...((backend === "auto" || backend === "forge") && {
        override_settings: {
          ...(!isTiledDiffusionEnabled &&
            !isUltimateUpscaleEnabled && {
              upscaler_for_img2img: upscaler,
            }),
          //TODO: expose clip stop on UI
          CLIP_stop_at_last_layers: clipSkip,
          // control_net_no_detectmap: true,
          // sd_vae: model?.isSdXl
          //   ? "sdxl_vae.safetensors"
          //   : "vae-ft-mse-840000-ema-pruned.ckpt",
        },
      }),
      ...(hasUltimateUpscale &&
        !txt2img &&
        isUltimateUpscaleEnabled &&
        (!hasRegionalPrompting || !isRegionalPromptingEnabled) && {
          script_name: "ultimate sd upscale",
          script_args: [
            //_
            null,
            //tile_width,
            model?.isSdXl || model?.isFlux || model?.isSd35 ? 1024 : 512,
            //tile_height
            model?.isSdXl || model?.isFlux || model?.isSd35 ? 1024 : 512,
            //mask_blur
            8,
            // padding,
            32,
            //seams_fix_width,
            0,
            // seams_fix_denoise
            false,
            // seams_fix_padding
            32,
            //upscaler_index
            (upscalers ?? []).findIndex((u) => u === upscaler) + 1,
            // save_upscaled_image
            false,
            // redraw_mode,
            0,
            // save_seams_fix_image
            false,
            // seams_fix_mask_blur,
            0,
            //seams_fix_type
            0,
            // target_size_type,
            0,
            // custom_width
            Math.ceil((width * scale) / 8) * 8,
            // custom_height
            Math.ceil((height * scale) / 8) * 8,
            // custom_scale
            showFullScalePass && fullScalePass ? 1 : scale,
          ],
        }),

      // TODO: consider moving this logic to BE and send raw params
      alwayson_scripts: {
        ...controlnetArgs,
        ...((backend === "auto" || backend === "forge") &&
          !txt2img &&
          hasSoftInpainting &&
          softInpainting?.isSoftInpaintingEnabled && {
            "soft inpainting": {
              args: [
                // Soft inpainting
                true,
                // Schedule bias
                softInpainting["Schedule bias"],
                // Preservation strength
                softInpainting["Preservation strength"],
                // Transition contrast boost
                softInpainting["Transition contrast boost"],
                // Mask influence
                softInpainting["Mask influence"],
                // Difference threshold
                softInpainting["Difference threshold"],
                // Difference contrast
                softInpainting["Difference contrast"],
              ],
            },
          }),
        ...(hasSelfAttentionGuidance && {
          "self attention guidance": {
            args: [
              //             "Enabled"
              isSelfAttentionGuidanceEnabled,
              // "Scale",
              0.75,
              // "SAG Mask Threshold"
              1.0,
            ],
          },
        }),
        ...(hasTiledVae && {
          "Tiled VAE": {
            args: [
              // # enabled,
              true, //!model?.isSdXl, //TODO: try with SDXL
              // # encoder_tile_size,
              960, //1536,
              // # decoder_tile_size
              64, //96,
              // # vae_to_gpu,
              true,
              // # fast_decoder,
              false,
              // # fast_encoder,
              false,
              // # color_fix,
              false,
            ],
          },
        }),
        ...(hasTiledDiffusion &&
          isTiledDiffusionEnabled && {
            "Tiled Diffusion": {
              args: [
                //  enabled: bool,
                isTiledDiffusionEnabled,
                //  method: str,
                "Mixture of Diffusers", //"MultiDiffusion", //"Mixture of Diffusers",
                // overwrite_image_size: bool,
                false,
                //  keep_input_size: bool,
                true,
                // image_width: int,
                512,
                //  image_height: int,
                512,
                // tile_width: int,
                128, //96,
                //  tile_height: int,
                128, //96,
                //  overlap: int,
                16, //48,
                //  tile_batch_size: int,
                3, //1
                // upscaler_index: str,
                upscaler, //"4x-UltraSharp",
                // scale_factor: float,
                showFullScalePass && fullScalePass ? 1 / scale : scale, //TODO: override width and height instead to ensure dims divisible by 8
                // noise_inverse: bool,
                false,
                // noise_inverse_steps: int,
                30, //30, //10,
                //  noise_inverse_retouch: float,
                1,
                // noise_inverse_renoise_strength: float,
                0, //0.4,
                // noise_inverse_renoise_kernel: int,
                64,

                // control_tensor_cpu: bool,
                false,
                // enable_bbox_control: bool,
                false,
                // draw_background: bool,
                false,
                //  causal_layers: bool,
                false,
                // *bbox_control_states: List[Any]
                null,
              ],
            },
          }),
        ...(hasMultidiffusionIntegrated &&
          isMultidiffusionEnabled &&
          (!hasRegionalPrompting || !isRegionalPromptingEnabled) && {
            "multidiffusion integrated": {
              args: [
                // enable
                isMultidiffusionEnabled,
                // method
                "MultiDiffusion", //"MultiDiffusion", "Mixture of Diffusers"
                // Tile Width
                model?.isSdXl ? 1024 : 768,
                // Tile Height
                model?.isSdXl ? 1024 : 768,
                // Tile Overlap
                32, //16 //64,
                //  Tile Batch Size
                2, //4,
              ],
            },
          }),
        ...((backend === "auto" || backend === "forge") &&
          hasRegionalPrompting &&
          isRegionalPromptingEnabled && {
            "forge couple": {
              args: [
                // enable
                isRegionalPromptingEnabled,
                // mode
                "Mask", //"Basic", "Advanced"
                // separator
                REGIONAL_PROMPTS_SEPARATOR,
                // direction
                "Horizontal", //Vertical", //"Horizontal",
                // background
                basePrompt && globalPromptWeight ? "First Line" : "None", //"First Line", // "None",
                // bg_weight,
                globalPromptWeight,
                // mapping
                regionMasksDataUrls
                  ?.map((imageString, index) => ({
                    mask: imageString?.replace("data:image/png;base64,", ""),
                    //TODO: make sure weights are mapped correctly with disabled in between layers
                    weight: regionalPromptsWeights?.[index],
                  }))
                  .filter(({ mask }) => !!mask) ?? [],
              ],
            },
          }),
      },
    };
    const attrs = {
      position: selectionBoxRef?.current?.getPosition(),
      scale,
      use_scaled_dimensions: showUseScaledDimensions && use_scaled_dimensions,
      full_scale_pass: showFullScalePass && fullScalePass,
      invert_mask: invertMask,
      model: model?.name,
      vae,
      ...((model.isFlux || model.isSd35) && { clip_models: clipModels }),
      ...((backend === "comfy" || schedulers?.length > 0) && {
        scheduler,
      }),
      ...(backend === "comfy" &&
        isRegionalPromptingEnabled && {
          is_regional_prompting_enabled: isRegionalPromptingEnabled,
          regional_prompts: regionMasksDataUrls
            ?.map((imageString, index) => ({
              prompt: regionalPromptsValues?.[index],
              mask: imageString?.replace("data:image/png;base64,", ""),
              weight: regionalPromptsWeights?.[index],
              id: regionalPromptsIds?.[index],
            }))
            .filter(({ mask }) => !!mask),
          global_prompt_weight: globalPromptWeight,
        }),
      ...(backend === "comfy" && iPAdapters?.length
        ? { ip_adapters: iPAdapters }
        : {}),
      ...(backend === "comfy" && !txt2img && model?.isSdXl
        ? { fooocus_inpaint }
        : {}),
      ...(backend === "comfy" && !txt2img
        ? { mask_blur: comfySoftInpainting.maskBlur }
        : {}),
      ...(backend === "comfy" && skimmedCfg?.is_enabled
        ? { skimmed_cfg: skimmedCfg }
        : {}),
      ...(backend === "comfy" && txt2img && splitRender?.is_enabled
        ? {
            split_render: {
              ...splitRender,
              split_ratio: 1 - splitRender.split_ratio,
            },
          }
        : {}),
      ultimate_upscale: isUltimateUpscaleEnabled,
      clip_skip: clipSkip,
    };

    // console.log(image, { attrs });

    batchImageResults?.length && dispatch(setBatchImageResults([]));

    sendMessage("generate", {
      image,
      attrs,
      session_name: sessionName,
    });

    function getControlnetArgs(): {
      controlnetArgs: {
        controlnet?: {
          args: ControlnetLayer[];
        };
      };
      iPAdapters?: object[];
    } {
      const enabledControlnetArgs = controlnetLayersArgs.filter(
        ({ isEnabled }) => isEnabled
      );
      let iPAdapters: object[] = [];
      const aggregated =
        enabledControlnetArgs.length > 0
          ? {
              controlnet: {
                args: controlnetLayersArgs.reduce(
                  (acc, item, index): ControlnetLayer[] => {
                    if (item.isEnabled && !item.isIpAdapter) {
                      const { weight_type, ...itemRest } = item;
                      const effectiveRegionMask = item.isMaskEnabled
                        ? controlnetDataUrls[index]?.maskImage
                        : null;
                      return [
                        ...acc,
                        {
                          ...itemRest,
                          // TODO: handle img2txt to send mask and init image or set on BE
                          image: item.overrideBaseLayer
                            ? controlnetDataUrls[index]?.image || null
                            : null,
                          ...(isA1111
                            ? {
                                effective_region_mask: effectiveRegionMask,
                                mask_image: null,
                              }
                            : {
                                mask_image: item.model
                                  ?.toLocaleLowerCase()
                                  .includes("inpaint")
                                  ? maskDataUrl
                                  : controlnetDataUrls[index]?.maskImage,
                              }),
                          mask: null,
                          // ...(item.isMaskEnabled && {
                          //   effective_region_mask:
                          //     controlnetDataUrls[index]?.maskImage,
                          // }),

                          // mask: maskDataUrl,
                          // mask: maskDataUrl,

                          ...(weight_type &&
                            checkIsIpAdapterControlnetModel(item.model) && {
                              advanced_weighting: weightTypesByName[
                                weight_type
                              ]?.(
                                model?.isSdXl ?? false,
                                item.weight,
                                item.composition_weight ?? 1
                              ),
                            }),
                        },
                      ];
                    } else if (item.isEnabled && item.isIpAdapter) {
                      iPAdapters = [
                        ...iPAdapters,
                        {
                          //TODO: handle when not overriding base layer, ALSO check for CN with Comfy
                          image: item.overrideBaseLayer
                            ? controlnetDataUrls[index]?.image?.replace(
                                /data:\S+;base64,/,
                                ""
                              ) || null
                            : initImageDataUrl?.replace(/data:\S+;base64,/, ""),
                          mask: controlnetDataUrls[index]?.maskImage?.replace(
                            /data:\S+;base64,/,
                            ""
                          ),
                          weight: item.weight,
                          start_at: item.guidance_start,
                          end_at: item.guidance_end,
                          weight_type: item.iPAdapterWeightType,
                          preset: item.iPAdapterModel,
                        },
                      ];
                    }
                    return acc;
                  },
                  [] as ControlnetLayer[]
                ),
              },
            }
          : {};

      return { controlnetArgs: aggregated, iPAdapters };
    }
  };

  const handleInterrupt = useCallback(
    (e?: MouseEvent<HTMLButtonElement>) => {
      e?.preventDefault();
      sendMessage("interrupt");
    },
    [sendMessage]
  );

  const handleKeydown: KeyboardEventHandler = useCallback(
    (e) => {
      if (e.key === "Enter" && e.ctrlKey && isConnected) {
        if (isGenerating) {
          handleInterrupt();
        } else {
          formRef.current?.requestSubmit();
        }
      } else if (e.key.toLowerCase() === "l" && e.ctrlKey && e.shiftKey) {
        seed && seed != -1 && setValue("isSeedPinned", !isSeedPinned);
      }
    },
    [handleInterrupt, isConnected, isGenerating, isSeedPinned, seed, setValue]
  );

  useGlobalKeydown({ handleKeydown, override: true });

  const { samplers } = useSamplers();
  const { schedulers } = useSchedulers();

  useEffect(() => {
    const ref = channel?.on("image", (data) => {
      const { seed } = data;
      !isSeedPinned &&
        (batchSize === 1 || isBatchDisabled) &&
        setValue("seed", seed);
    });
    return () => {
      ref && channel?.off("image", ref);
    };
  }, [channel, dispatch, isSeedPinned, setValue, batchSize, isBatchDisabled]);

  useCustomEventListener("updateSeed", (seed: MainFormValues["seed"]) => {
    !isSeedPinned && setValue("seed", seed);
  });

  const showFullScalePass =
    (batchSize === 1 || isBatchDisabled || backend === "comfy") && scale < 1;
  const showSecondPassStrength =
    (showFullScalePass && fullScalePass) || (txt2img && scale > 1);
  const showUseScaledDimensions =
    (txt2img && showFullScalePass && !fullScalePass) ||
    (scale != 1 && !(showFullScalePass && fullScalePass));
  const showUpscaler = (txt2img && showSecondPassStrength) || !txt2img;
  const showSoftInpainting =
    (backend === "auto" || backend === "forge") && !txt2img;

  const [isLoraModalVisible, setIsLoraModalVisible] = useState(false);

  useCustomEventListener("showLorasModal", () => setIsLoraModalVisible(true));

  return (
    <FormProvider {...methods}>
      <LorasModal
        open={isLoraModalVisible}
        onClose={() => setIsLoraModalVisible(false)}
      />

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col p-4 px-6 pt-1 pb-10 gap-8  w-full"
        ref={formRef}
      >
        {(backend === "auto" || backend === "comfy") &&
          !model.isFlux &&
          !model.isSd35 && (
            <div className="flex place-items-center gap-3 justify-between">
              <Label htmlFor="clip_skip" className="whitespace-nowrap">
                Clip Skip
              </Label>

              <Controller
                name="clip_skip"
                control={control}
                render={({ field }) => (
                  <Input
                    id="clip_skip"
                    className="text-center max-w-16"
                    type="number"
                    step={1}
                    min={1}
                    max={10}
                    {...field}
                    onChange={(event) => field.onChange(+event.target.value)}
                  />
                )}
                defaultValue={1}
              />
            </div>
          )}

        {!isGenerating || !isConnected ? (
          <Button
            fullWidth
            type="submit"
            className="mb-2 sticky top-2 w-[100%] z-[20] shadow-md shadow-black/50 enabled:bg-neutral-700 enabled:hover:bg-neutral-600 enabled:hover:text-white "
            disabled={!isConnected}
          >
            Generate
          </Button>
        ) : (
          <Button
            className="mb-2 bg-red-600 enabled:hover:bg-red-700 enabled:hover:border-red-800 hover:text-white sticky top-2 z-[20]"
            fullWidth
            onClick={handleInterrupt}
          >
            Interrupt
          </Button>
        )}

        <div className="flex flex-col gap-2">
          <Label>Prompt</Label>

          <Controller
            name="prompt"
            control={control}
            render={({ field }) => (
              <Editor autofocus placeholder="Prompt" {...field} />
            )}
            defaultValue=""
          />
        </div>

        <LorasSection />

        {hasRegionalPrompting && <RegionalPromptsFields />}
        {(backend !== "comfy" || !model.isFlux) && (
          <div className="flex flex-col gap-2">
            <Label>Negative Prompt</Label>

            <Controller
              name="negative_prompt"
              control={control}
              render={({ field }) => (
                <Editor placeholder="Negative Prompt" {...field} />
              )}
              defaultValue=""
            />
          </div>
        )}

        <Controller
          name="txt2img"
          control={control}
          defaultValue={true}
          render={({ field }) => <Txt2ImageButtonGroup {...field} />}
        />
        <div className="flex flex-col gap-2">
          <Label>Sampler</Label>
          <Controller
            name="sampler_name"
            control={control}
            render={({ field }) => <Select items={samplers} {...field} />}
          />
        </div>
        {(backend === "comfy" || schedulers?.length > 0) && (
          <div className="flex flex-col gap-2">
            <Label>Scheduler</Label>
            <Controller
              name="scheduler"
              control={control}
              defaultValue="karras"
              render={({ field }) => <Select items={schedulers} {...field} />}
            />
          </div>
        )}

        {!txt2img && (backend === "auto" || backend === "forge") && (
          <div className="flex flex-col gap-2">
            <Label /*htmlFor="inpainting_fill"*/>Fill Method</Label>
            <Controller
              name="inpainting_fill"
              control={control}
              // rules={{ required: true }}
              rules={{
                onChange(e: ChangeEvent<HTMLInputElement>) {
                  const value = e.target.value;
                  // Set desnoising strength to 1 when using "Latent Noise" & "Latent Nothing"
                  if (value === "2" || value === "3") {
                    setValue("denoising_strength", 1);
                  }
                },
              }}
              defaultValue={"1"}
              render={({ field }) => (
                <Select
                  items={[
                    { value: "0", label: "Fill" },
                    { value: "1", label: "Original" },
                    { value: "2", label: "Latent Noise" },
                    { value: "3", label: "Latent Nothing" },
                  ]}
                  // placeholder="Select Fill Method"
                  {...field}
                />
              )}
            />
          </div>
        )}

        {showSoftInpainting && <SoftInpaintingFields control={control} />}

        {backend === "comfy" && !txt2img && (
          <ComfySoftInpaintingFields control={control} />
        )}

        {backend === "comfy" && model?.isSdXl && !txt2img && (
          <Controller
            name="fooocus_inpaint"
            control={control}
            defaultValue={false}
            render={({ field }) => (
              <Checkbox {...field}>Fooocus Inpaint</Checkbox>
            )}
          />
        )}

        <Controller
          name="steps"
          control={control}
          // rules={{ required: true }}
          render={({ field }) => (
            <Slider min={1} max={150} step={1} label="Steps" {...field} />
          )}
          defaultValue={20}
          rules={{ required: true }}
        />
        {!txt2img && (
          <Controller
            name="denoising_strength"
            control={control}
            // rules={{ required: true }}
            render={({ field }) => (
              <Slider
                min={0}
                max={1}
                step={0.01}
                label="Denoising Strength"
                {...field}
              />
            )}
            defaultValue={0.7}
          />
        )}
        <Controller
          name="cfg_scale"
          control={control}
          defaultValue={model.isFlux ? 1 : 4}
          // rules={{ required: true }}
          render={({ field }) => (
            <Slider step={0.1} min={1} max={32} label="CFG Scale" {...field} />
          )}
        />

        {backend === "comfy" && (
          <>
            {model?.isFlux && (
              <Controller
                name="flux_guidance"
                control={control}
                defaultValue={3.5}
                // rules={{ required: true }}
                render={({ field }) => (
                  <Slider
                    step={0.1}
                    min={0}
                    max={30}
                    defaultValue={3.5}
                    label="Flux Guidnace"
                    {...field}
                  />
                )}
              />
            )}
            <SkimmedCfgFields control={control} />
            {model?.isFlux && txt2img && (
              <SplitRenderFields control={control} />
            )}
          </>
        )}
        {/* TODO: Show image_cfg_scale only with ip2p */}
        {/* {true && (
        <Controller
          name="image_cfg_scale"
          control={control}
          defaultValue={1.5}
          render={({ field }) => (
            <Slider
              step={0.01}
              min={0}
              max={3}
              label="Image CFG Scale"
              {...field}
            />
          )}
        />
      )} */}

        <Controller
          name="width"
          control={control}
          // rules={{ required: true }}
          render={({ field }) => (
            <Slider min={0} max={5000} step={8} label="Width" {...field} />
          )}
          defaultValue={DEFAULT_WIDTH_VALUE}
          rules={{
            required: true,
            onChange(e: ChangeEvent<HTMLInputElement>) {
              const value = +e.target.value;
              dispatch(updateSelectionBox({ width: value }));
              broadcastSelectionBoxUpdate({ width: value });
            },
          }}
        />

        <Controller
          name="height"
          control={control}
          render={({ field }) => (
            <Slider min={0} max={5000} step={8} label="Height" {...field} />
          )}
          defaultValue={DEFAULT_HEIGHT_VALUE}
          rules={{
            required: true,
            onChange(e: ChangeEvent<HTMLInputElement>) {
              const value = +e.target.value;
              dispatch(updateSelectionBox({ height: value }));
              broadcastSelectionBoxUpdate({ height: value });
            },
          }}
        />
        <div className="flex flex-col">
          {/* TODO: Add a button to reset scale to 1 */}
          <Controller
            name="scale"
            control={control}
            // rules={{ required: true }}
            render={({ field }) => (
              <Slider
                min={0.1}
                max={10}
                step={0.01}
                label="Scale"
                defaultValue={1}
                {...field}
              />
            )}
            defaultValue={1}
            rules={{ required: true }}
          />
          {scale !== 1 && (
            <span className="pt-2 text-sm">
              {roundToClosestMultipleOf8Down(+width * scale)}x
              {roundToClosestMultipleOf8Down(+height * scale)}
            </span>
          )}
        </div>
        {showUpscaler && (
          <div className="flex flex-col gap-2">
            <Label>Upscaler</Label>
            <Controller
              name="upscaler"
              control={control}
              // rules={{ required: true }}
              defaultValue="None"
              render={({ field }) => (
                <Select
                  items={sortedUpscalers && sortedUpscalers}
                  placeholder="Upscaler"
                  {...field}
                />
              )}
            />
          </div>
        )}
        {showFullScalePass && (
          <Controller
            name="full_scale_pass"
            control={control}
            defaultValue={true}
            render={({ field }) => (
              <Checkbox {...field}>Full Scale Pass</Checkbox>
            )}
          />
        )}

        {showSecondPassStrength && (
          <Controller
            name="sp_denoising_strength"
            control={control}
            // rules={{ required: true }}
            render={({ field }) => (
              <Slider
                min={0}
                max={1}
                step={0.01}
                label="Second Pass Denoising"
                {...field}
              />
            )}
            defaultValue={0.5}
          />
        )}
        {showUseScaledDimensions && (
          <Controller
            name="use_scaled_dimensions"
            control={control}
            defaultValue={true}
            render={({ field }) => (
              <Checkbox {...field}>Use Scaled Dimensions</Checkbox>
            )}
          />
        )}

        {hasTiledVae && (
          <Controller
            name="isTiledDiffusionEnabled"
            control={control}
            defaultValue={false}
            rules={{
              onChange: (e: ChangeEvent<HTMLInputElement>) => {
                const value = e.target.value;
                value && setValue("isUltimateUpscaleEnabled", false);
                value && upscaler === "Latent" && setValue("upscaler", "None");
              },
            }}
            render={({ field }) => (
              <Checkbox {...field}>Tiled Diffusion</Checkbox>
            )}
          />
        )}
        {hasMultidiffusionIntegrated && (
          <Controller
            name="isMultidiffusionEnabled"
            control={control}
            defaultValue={false}
            rules={{
              onChange: (e: ChangeEvent<HTMLInputElement>) => {
                const value = e.target.value;
                value && setValue("isUltimateUpscaleEnabled", false);
              },
            }}
            render={({ field }) => (
              <Checkbox
                {...field}
                title={
                  isRegionalPromptingEnabled ? "Regional Prompts Enabled" : ""
                }
              >
                Tiled Diffusion
              </Checkbox>
            )}
            disabled={hasRegionalPrompting && isRegionalPromptingEnabled}
          />
        )}
        {!txt2img && hasUltimateUpscale && (
          <Controller
            name="isUltimateUpscaleEnabled"
            control={control}
            defaultValue={false}
            rules={{
              onChange: (e: ChangeEvent<HTMLInputElement>) => {
                const value = e.target.value;
                value && setValue("isTiledDiffusionEnabled", false);
                value && setValue("isMultidiffusionEnabled", false);
                value && upscaler === "Latent" && setValue("upscaler", "None");
              },
            }}
            disabled={hasRegionalPrompting && isRegionalPromptingEnabled}
            render={({ field }) => (
              <Checkbox
                {...field}
                title={
                  isRegionalPromptingEnabled ? "Regional Prompts Enabled" : ""
                }
              >
                Ultimate Upscale
              </Checkbox>
            )}
          />
        )}
        {hasSelfAttentionGuidance && (
          <Controller
            name="isSelfAttentionGuidanceEnabled"
            control={control}
            defaultValue={false}
            render={({ field }) => (
              <Checkbox {...field}>Self Attention Guidance</Checkbox>
            )}
          />
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="seed">Seed</Label>
          <div className="flex">
            <Controller
              name="seed"
              control={control}
              defaultValue={-1}
              render={({ field }) => (
                <Input
                  id="seed"
                  className="p-1.5 rounded-tr-none rounded-br-none h-fit"
                  type="number"
                  fullWidth
                  step={1}
                  min={-1}
                  {...field}
                />
              )}
            />

            <Controller
              name="isSeedPinned"
              control={control}
              rules={{ required: false }}
              defaultValue={false}
              render={({ field }) => (
                <Toggle
                  pressedIconComponent={LockClosedIcon}
                  unpressedIconComponent={LockOpen2Icon}
                  title="Un/Lock Seed"
                  className="data-[state=on]:text-primary border-neutral-700 rounded-tl-none rounded-bl-none hover:border-inherit"
                  {...field}
                />
              )}
            />
          </div>
        </div>

        <div className="flex flex-col">
          <Controller
            name="batch_size"
            control={control}
            // rules={{ required: true }}
            render={({ field }) => (
              <Slider
                min={1}
                max={7}
                step={1}
                label="Batch Size"
                disabled={isBatchDisabled}
                {...field}
              />
            )}
            defaultValue={1}
          />
        </div>

        {/* <Label htmlFor="inpaintFull">
          Inpaint full res
          <input
            id="inpaintFull"
            className="rounded flex-1 p-2 w-fit"
            type="checkbox"
            {...register("inpaint_full_res")}
          />
        </Label> */}
        {/* <DevTool control={control} /> */}
      </form>
    </FormProvider>
  );
};

export default MainForm;
