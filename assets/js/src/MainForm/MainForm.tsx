import React, {
  ChangeEvent,
  KeyboardEventHandler,
  MouseEvent,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  isSdXlModel,
  roundToClosestMultipleOf8Down,
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
import { selectInvertMask } from "../state/canvasSlice";
import useScripts from "../hooks/useScripts";
import {
  selectBackend,
  selectSelectedModel,
  selectSelectedVae,
} from "../state/optionsSlice";
import useSchedulers from "../hooks/useSchedulers";
import SoftInpaintingFields, {
  SoftInpaintingArgs,
} from "./SoftInpaintingFields/SoftInpaintingFields";
import RegionalPromptsFields from "./RegionalPromptsFields";
import { processPrompt } from "./utils";
import { REGIONAL_PROMPTS_SEPARATOR } from "./constants";
import { selectPromptRegionLayers } from "../state/promptRegionsSlice";
import { showNotification } from "../Notifications/utils";

export type MainFormValues = Record<string, any> & {
  softInpainting: SoftInpaintingArgs;
  regionalPrompts?: Record<string, { prompt: EditorState; weight }>;
  globalPromptWeight?: number;
};

const MainForm = () => {
  const { channel, sendMessage } = useSocket();
  const backend = useAppSelector(selectBackend);
  const methods = useForm<MainFormValues>();
  const { control, handleSubmit, setValue } = methods;
  const formRef = useRef<HTMLFormElement>(null);
  const scale = useWatch({ name: "scale", control, defaultValue: 1 });
  const width = useWatch({ name: "width", control });
  const height = useWatch({ name: "height", control });
  const txt2img = useWatch({ name: "txt2img", control, defaultValue: true });
  const isSeedPinned = useWatch({ name: "isSeedPinned", control });

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
    hasForgeCouple,
    hasMultidiffusionIntegrated,
  } = useScripts();

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

  const isConnected = useAppSelector(selectIsConnected);

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
  const { selectionBoxRef } = refs;

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
      const referenceDim = model.isSdXl ? 1024 : 512;

      const minDimension = Math.min(+width, +height);

      if (minDimension < referenceDim) {
        const newScale = Math.min(
          10,
          (model.isSdXl ? 1024 : 516.5) / minDimension
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
      globalPromptWeight,
      ...rest
    } = data;

    const controlnetArgs: ReturnType<typeof getControlnetArgs> = hasControlnet
      ? getControlnetArgs()
      : {};
    const { basePrompt, processedPrompt, regionalPromptsWeights } =
      processPrompt({
        prompt,
        regionalPrompts,
        isRegionalPromptingEnabled,
        promptRegions,
      });

    // Show validation warning if prompt is no set with regional prompts
    if (!basePrompt && isRegionalPromptingEnabled) {
      showNotification({
        body: "Regional prompting requires a base prompt",
        title: "Missing Prompt",
        type: "warning",
      });
      return;
    }

    const image = {
      prompt: processedPrompt,
      negative_prompt:
        typeof negative_prompt === "string"
          ? prompt
          : editorJsonToText((negative_prompt as EditorState).doc.toJSON()),
      ...rest,
      ...(!isSeedPinned && { seed: -1 }),
      mask: txt2img ? "" : maskDataUrl,
      init_images: txt2img
        ? controlnetArgs.controlnet?.args.some(
            ({ overrideBaseLayer }) => !overrideBaseLayer
          )
          ? [initImageDataUrl]
          : []
        : [initImageDataUrl],
      enable_hr: scale > 1,
      hr_upscaler:
        backend == "auto" && upscaler === "Latent"
          ? "Latent (nearest-exact)"
          : upscaler,
      hr_scale: scale,
      // seed_resize_from_w: rest.width,
      // seed_resize_from_h: rest.height,
      ...(backend === "auto" && {
        override_settings: {
          ...(!isTiledDiffusionEnabled &&
            !isUltimateUpscaleEnabled && {
              upscaler_for_img2img: upscaler,
            }),
          // sd_vae: model?.isSdXl
          //   ? "sdxl_vae.safetensors"
          //   : "vae-ft-mse-840000-ema-pruned.ckpt",
        },
      }),
      ...(hasUltimateUpscale &&
        !txt2img &&
        isUltimateUpscaleEnabled &&
        (!hasForgeCouple || !isRegionalPromptingEnabled) && {
          script_name: "ultimate sd upscale",
          script_args: [
            //_
            null,
            //tile_width,
            model?.isSdXl ? 1024 : 512,
            //tile_height
            model?.isSdXl ? 1024 : 512,
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
        ...(backend === "auto" &&
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
              !model?.isSdXl, //TODO: try with SDXL
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
          (!hasForgeCouple || !isRegionalPromptingEnabled) && {
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
        ...(hasForgeCouple &&
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
      ...(backend === "comfy" && { scheduler }),
      ultimate_upscale: isUltimateUpscaleEnabled,
    };

    // console.log(image, { attrs });

    sendMessage("generate", {
      image,
      attrs,
      session_name: sessionName,
    });

    function getControlnetArgs(): { controlnet?: { args: ControlnetLayer[] } } {
      const enabledControlnetArgs = controlnetLayersArgs.filter(
        ({ isEnabled }) => isEnabled
      );
      const aggregated =
        enabledControlnetArgs.length > 0
          ? {
              controlnet: {
                args: controlnetLayersArgs.reduce((acc, item, index) => {
                  if (item.isEnabled) {
                    return [
                      ...acc,
                      {
                        ...item,
                        // TODO: handle img2txt to send mask and init image or set on BE
                        image: item.overrideBaseLayer
                          ? controlnetDataUrls[index]?.image || null
                          : null,
                        mask_image: controlnetDataUrls[index]?.maskImage,
                        mask: null,
                      },
                    ];
                  }
                  return acc;
                }, [] as ControlnetLayer[]),
              },
            }
          : {};

      return aggregated;
    }
  };

  const handleKeydown: KeyboardEventHandler = useCallback(
    (e) => {
      if (e.key === "Enter" && e.ctrlKey && !isGenerating && isConnected) {
        formRef.current?.requestSubmit();
      }
    },
    [isConnected, isGenerating]
  );

  useGlobalKeydown({ handleKeydown, override: true });

  const { samplers } = useSamplers();
  const { schedulers } = useSchedulers();

  useEffect(() => {
    const ref = channel?.on("image", (data) => {
      const { seed } = data;
      !isSeedPinned && setValue("seed", seed);
    });
    return () => {
      ref && channel?.off("image", ref);
    };
  }, [channel, dispatch, isSeedPinned, setValue]);

  const handleInterrupt = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    sendMessage("interrupt");
  };

  const showFullScalePass = scale < 1;
  const showSecondPassStrength =
    (showFullScalePass && fullScalePass) || (txt2img && scale > 1);
  const showUseScaledDimensions =
    (txt2img && showFullScalePass && !fullScalePass) ||
    (scale != 1 && !(showFullScalePass && fullScalePass));
  const showUpscaler = (txt2img && showSecondPassStrength) || !txt2img;
  const showSoftInpainting = backend === "auto" && !txt2img;
  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col p-4 px-6 pt-1 pb-10 gap-8  w-full"
        ref={formRef}
      >
        {!isGenerating || !isConnected ? (
          <button
            type="submit"
            className="bg-[#302d2d] border border-neutral-700 enabled:hover:bg-[#494949] disabled:cursor-not-allowed mb-2 p-2 rounded cursor-pointer sticky top-2 w-[100%] stuck::bg-red-200 z-[20] shadow-md shadow-black/50"
            disabled={!isConnected}
          >
            Generate
          </button>
        ) : (
          <button
            className="bg-red-600 mb-2 p-2 rounded cursor-pointer sticky top-2 w-[100%] z-[20]"
            onClick={handleInterrupt}
          >
            Interrupt
          </button>
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
        {hasForgeCouple && <RegionalPromptsFields />}
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

        {backend === "comfy" && (
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

        {!txt2img && backend === "auto" && (
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
          defaultValue={7}
          // rules={{ required: true }}
          render={({ field }) => (
            <Slider step={0.1} min={1} max={30} label="CFG Scale" {...field} />
          )}
        />
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
              <Slider min={0.1} max={10} step={0.01} label="Scale" {...field} />
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
            disabled={hasForgeCouple && isRegionalPromptingEnabled}
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
            disabled={hasForgeCouple && isRegionalPromptingEnabled}
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

        {/* <div className="flex flex-col">
        <Controller
          name="batch_size"
          control={control}
          // rules={{ required: true }}
          render={({ field }) => (
            <Slider min={1} max={10} step={1} label="Batch Size" {...field} />
          )}
          defaultValue={1}
        />
      </div> */}
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
