import React, {
  ChangeEvent,
  MouseEvent,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
// import { DevTool } from "@hookform/devtools";

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
import { selectControlnetLayers } from "../state/controlnetSlice";
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

const MainForm = () => {
  const { channel, sendMessage } = useSocket();
  const { control, handleSubmit, setValue } = useForm();
  const formRef = useRef<HTMLFormElement>(null);
  const scale = useWatch({ name: "scale", control, defaultValue: 1 });
  const width = useWatch({ name: "width", control });
  const height = useWatch({ name: "height", control });
  const txt2img = useWatch({ name: "txt2img", control });
  const fullScalePass = useWatch({
    name: "full_scale_pass",
    control,
    defaultValue: true,
  });

  const { upscalers } = useUpscalers();

  const {
    hasSelfAttentionGuidance,
    hasTiledDiffusion,
    hasTiledVae,
    hasControlnet,
  } = useScripts();

  const isConnected = useAppSelector(selectIsConnected);

  const handleAddImage = ({ pngInfo }) => {
    if (pngInfo) {
      const {
        prompt,
        negativePrompt,
        sampler,
        seed,
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

  useEffect(() => {
    const { width, height } = selectionBox;
    setValue("width", width);
    setValue("height", height);
  }, [selectionBox, setValue]);

  useEffect(() => {
    // Update scale if either width of height go below 512
    if (width && height) {
      const minDimension = Math.min(+width, +height);
      // TODO: use a dynamic value for minimum res; 512
      if (minDimension < 512) {
        const newScale = Math.min(10, 516.5 / minDimension).toFixed(2);
        // FIXME: set new scale to 1 if marginally greater than 1
        setValue("scale", +newScale);
      }
    }
  }, [width, height, setValue]);

  const invertMask = useAppSelector(selectInvertMask);

  const onSubmit = async (data) => {
    const { maskDataUrl, initImageDataUrl, controlnetDataUrls } =
      await getLayers({
        refs,
        isMaskLayerVisible,
        controlnetLayersArgs,
      });

    const {
      scale,
      isSeedPinned,
      use_scaled_dimensions,
      full_scale_pass,
      isTiledDiffusionEnabled,
      isSelfAttentionGuidanceEnabled,
      upscaler,
      prompt,
      negative_prompt,
      ...rest
    } = data;

    const image = {
      prompt:
        typeof prompt === "string"
          ? prompt
          : editorJsonToText((prompt as EditorState).doc.toJSON()),
      negative_prompt:
        typeof negative_prompt === "string"
          ? prompt
          : editorJsonToText((negative_prompt as EditorState).doc.toJSON()),
      ...rest,
      ...(!isSeedPinned && { seed: -1 }),
      mask: maskDataUrl,
      init_images: [initImageDataUrl],
      enable_hr: scale > 1,
      hr_upscaler: upscaler,
      hr_scale: scale,
      // seed_resize_from_w: rest.width,
      // seed_resize_from_h: rest.height,
      override_settings: {
        ...(!isTiledDiffusionEnabled && {
          upscaler_for_img2img: upscaler,
        }),
      },
      // TODO: consider moving this logic to BE and send raw params
      alwayson_scripts: {
        ...(hasControlnet && getControlnetArgs()),
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
              true,
              // # encoder_tile_size,
              960,
              // # decoder_tile_size
              64,
              // # vae_to_gpu,
              true,
              // # fast_decoder,
              true,
              // # fast_encoder,
              true,
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
                8, //48,
                //  tile_batch_size: int,
                1, //1
                // upscaler_index: str,
                upscaler, //"4x-UltraSharp",
                // scale_factor: float,
                scale, //TODO: override width and height instead to ensure we dims divisible by 8
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
      },
    };
    console.log(image, {
      attrs: {
        position: selectionBoxRef?.current?.getPosition(),
        scale,
        use_scaled_dimensions: showUseScaledDimensions && use_scaled_dimensions,
        full_scale_pass,
        invertMask,
      },
    });
    sendMessage("generate", {
      image,
      attrs: {
        position: selectionBoxRef?.current?.getPosition(),
        scale,
        use_scaled_dimensions: showUseScaledDimensions && use_scaled_dimensions,
        full_scale_pass: showFullScalePass && fullScalePass,
        invert_mask: invertMask,
      },
      session_name: sessionName,
    });

    function getControlnetArgs() {
      const enabledControlnetArgs = controlnetLayersArgs.filter(
        ({ isEnabled }) => isEnabled
      );
      const aggregated = enabledControlnetArgs.length > 0 && {
        controlnet: {
          args: controlnetLayersArgs
            .map(
              (item, index) =>
                item.isEnabled && {
                  ...item,
                  // TODO: handle img2txt to send mask and init image or set on BE
                  input_image: item.overrideBaseLayer
                    ? controlnetDataUrls[index] || null
                    : null,
                  mask: null,
                }
            )
            .filter((item) => item),
        },
      };

      return aggregated;
    }
  };

  const handleKeydown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Enter" && e.ctrlKey && !isGenerating) {
        formRef.current?.requestSubmit();
      }
    },
    [isGenerating]
  );

  useGlobalKeydown({ handleKeydown, override: true });

  const { samplers } = useSamplers();

  useEffect(() => {
    const ref = channel?.on("image", (data) => {
      const { seed } = data;
      setValue("seed", seed);
    });
    return () => {
      ref && channel?.off("image", ref);
    };
  }, [channel, dispatch, setValue]);

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
  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col p-4 px-6 pt-1 pb-10 gap-8  w-full"
      ref={formRef}
    >
      {!isGenerating || !isConnected ? (
        <button
          type="submit"
          className="bg-[#302d2d] border border-neutral-700 enabled:hover:bg-[#494949] disabled:cursor-not-allowed mb-2 p-2 rounded cursor-pointer sticky top-0 w-[100%] stuck::bg-red-200 z-10 shadow-md shadow-black/30"
          disabled={!isConnected}
        >
          Generate
        </button>
      ) : (
        <button
          className="bg-red-600 mb-2 p-2 rounded cursor-pointer sticky top-0 w-[100%] z-10"
          onClick={handleInterrupt}
        >
          Interrupt
        </button>
      )}
      <div className="flex flex-col gap-2">
        <Label htmlFor="prompt">Prompt</Label>

        <Controller
          name="prompt"
          control={control}
          render={({ field }) => (
            <Editor autofocus placeholder="Prompt" {...field} />
          )}
          defaultValue=""
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="negativePrompt">Negative Prompt</Label>

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
        defaultValue={false}
        render={({ field }) => <Txt2ImageButtonGroup {...field} />}
      />
      <div className="flex flex-col gap-2">
        <Label htmlFor="sampler_name">Sampler</Label>
        <Controller
          name="sampler_name"
          control={control}
          render={({ field }) => <Select items={samplers} {...field} />}
        />
      </div>

      {!txt2img && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="inpainting_fill">Fill Method</Label>
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
            defaultValue={"3"}
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
          defaultValue={1}
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
          <Slider min={0} max={3072} step={8} label="Width" {...field} />
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
          <Slider min={0} max={3072} step={8} label="Height" {...field} />
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
          <Label htmlFor="upscaler">Upscaler</Label>
          <Controller
            name="upscaler"
            control={control}
            // rules={{ required: true }}
            render={({ field }) => (
              <Select
                items={upscalers && ["None", ...upscalers]}
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
            <Checkbox id="full_scale_pass" {...field}>
              Full Scale Pass
            </Checkbox>
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
            <Checkbox id="use_scaled_dimensions" {...field}>
              Use Scaled Dimensions
            </Checkbox>
          )}
        />
      )}

      {hasTiledVae && (
        <Controller
          name="isTiledDiffusionEnabled"
          control={control}
          defaultValue={false}
          render={({ field }) => (
            <Checkbox id="isTiledDiffusionEnabled" {...field}>
              Tiled Diffusion
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
            <Checkbox id="isSelfAttentionGuidanceEnabled" {...field}>
              Self Attention Guidance
            </Checkbox>
          )}
        />
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="Seed">Seed</Label>
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
  );
};

export default MainForm;
