import useSocket from "../hooks/useSocket";
import { useCallback, useLayoutEffect, useState } from "react";
import useModels from "../hooks/useModels";
import { ModelSelect, VaeSelect } from "../App";
import Slider from "../components/Slider";
import Select from "../components/Select";
import ClipModelMultiSelect from "../MainForm/ClipModelMultiSelect";
import Label from "../components/Label";
import { ModelType } from "../App.d";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import useOptions from "../hooks/useOptions";
import useSamplers from "../hooks/useSamplers";
import useSchedulers from "../hooks/useSchedulers";
import { getModelWithParams } from "../utils";
import useBackend from "../hooks/useBackend";
import Input from "../components/Input";
import Button from "../components/Button";

type ConfigFormValues = {
  model: {
    vae: string;
    clip_models?: string[];
    clip_skip?: number;
    steps: number;
    cfg_scale: number;
    flux_guidance: number;
    sampler_name: string;
    scheduler: string;
    modelType: ModelType;
  };
};

const MODEL_TYPES: { label: string; value: ModelType }[] = [
  { label: "SD 1.5", value: "sd1.5" },
  { label: "SDXL", value: "sdxl" },
  { label: "SD3.5", value: "sd3.5" },
  { label: "Pony", value: "pony" },
  { label: "Flux", value: "flux" },
];

const ModelsSection = ({ open }) => {
  const { samplers } = useSamplers();
  const { schedulers } = useSchedulers();
  const {
    models,
    isModelLoading,
    fetchData: refetchModels,
    loadModelConfig,
    fetchVaes: refetchVaes,
    isVaeLoading,
    selectedModel,
    selectedVae,
    vaes,
    clipModels,
  } = useModels();
  const { backend } = useBackend();

  const [selectedModelState, setSelectedModelState] =
    useState<typeof selectedModel>();
  const [defaultModelState, setDefaultModelState] =
    useState<ConfigFormValues["model"]>();

  const [prevOpen, setPrevOpen] = useState<boolean>();
  const [prevSelectedModel, setPrevSelectedModel] =
    useState<typeof selectedModelState>();

  const { control, handleSubmit, setValue, reset } = useForm<ConfigFormValues>({
    shouldUnregister: true,
    // defaultValues: getDefaultValues(defaultModelState),
  });
  const getDefaultValues = useCallback(
    (modelState) => {
      const allowsAutomaticVae =
        modelState?.modelType !== "flux" && modelState?.modelType !== "sd3.5";
      return {
        model: {
          ...modelState,
          vae:
            modelState.vae ??
            selectedVae ??
            (allowsAutomaticVae ? undefined : "Automatic"),
          clip_models: modelState.clip_models ?? [],
        },
        civit: { api_token: "" },
      };
    },
    [selectedVae]
  );

  const loadModelData = useCallback(
    async (modelName: string) => {
      const modelConfig = await loadModelConfig(modelName);
      const updatedModelConfig = {
        ...(modelConfig ?? {}),
        modelType:
          modelConfig?.modelType ?? getModelWithParams(modelName).modelType,
      };

      setDefaultModelState(updatedModelConfig);

      if (modelConfig) {
        setValue("model", updatedModelConfig);
      }

      const newDefaultValues = getDefaultValues(updatedModelConfig);
      reset(newDefaultValues);
    },
    [getDefaultValues, loadModelConfig, reset, setValue]
  );

  if (selectedModelState?.name !== prevSelectedModel?.name) {
    setPrevSelectedModel(selectedModelState);
    if (selectedModelState?.name) {
      loadModelData(selectedModelState.name);
    }
  }

  const { refetch: refetchOptions } = useOptions();

  useLayoutEffect(() => {
    if (prevOpen !== open) {
      setPrevOpen(open);
      if (open && selectedModelState?.name !== selectedModel?.name)
        setSelectedModelState(selectedModel);
      else {
        loadModelData(selectedModel.name);
      }
    }
  }, [prevOpen, open, selectedModel, selectedModelState, reset, loadModelData]);

  const { sendMessage } = useSocket();

  const onSubmit: SubmitHandler<ConfigFormValues> = async (params) => {
    // if (activeSection === "civit") {
    //   sendCivitMessage("civit_store_config", params.civit);
    // } else if (activeSection === "models") {
    sendMessage("store_model_config", {
      name: selectedModelState?.name,
      backend,
      config: params.model,
    });
    // }
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="relative flex-1 h-full">
      <div className="flex flex-col gap-5 w-96">
        <Label className="flex flex-col gap-2">
          Model
          {/* <Controller
    name="civit.api_token"
    control={control}
    render={({ field }) => (

    )}
  /> */}
          <ModelSelect
            className="w-full"
            // {...field}
            refetchOptions={refetchOptions}
            isModelLoading={isModelLoading}
            models={models}
            refetchModels={refetchModels}
            setModel={(value) => {
              setSelectedModelState(getModelWithParams(value));
            }}
            selectedModel={selectedModelState}
            shouldSetDefaultValue={false}
          />
        </Label>
        <Label className="flex flex-col gap-2">
          VAE
          <Controller
            name="model.vae"
            control={control}
            render={({ field }) => (
              <VaeSelect
                className="w-full"
                refetchOptions={refetchOptions}
                vaes={vaes}
                refetchVaes={refetchVaes}
                setVae={field.onChange}
                selectedVae={field.value}
                isVaeLoading={isVaeLoading}
                isModelLoading={isModelLoading}
                selectedModel={selectedModelState}
                shouldSetDefaultValue
              />
            )}
          />
        </Label>
        <div className="flex flex-col gap-2">
          <Label>Model Type</Label>
          <Controller
            name="model.modelType"
            control={control}
            render={({ field }) => <Select items={MODEL_TYPES} {...field} />}
          />
        </div>
        {(selectedModelState?.isFlux || selectedModelState?.isSd35) && (
          <Controller
            name="model.clip_models"
            control={control}
            render={({ field }) => (
              <Label className="flex flex-col gap-2">
                Text Encoders
                <ClipModelMultiSelect
                  className="w-full"
                  clipModels={clipModels}
                  setClipModels={field.onChange}
                  selectedClipModels={field.value ?? []}
                />
              </Label>
            )}
            defaultValue={[]}
            shouldUnregister
          />
        )}
        {!selectedModelState?.isFlux &&
          !selectedModelState?.isSd35 &&
          (backend === "comfy" || backend === "auto") && (
            <div className="flex place-items-center gap-3 justify-between">
              <Label htmlFor="clip_skip" className="whitespace-nowrap">
                Clip Skip
              </Label>
              <Controller
                name="model.clip_skip"
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
                shouldUnregister
              />
            </div>
          )}

        <Controller
          name="model.steps"
          control={control}
          // rules={{ required: true }}
          render={({ field }) => (
            <Slider
              min={1}
              max={150}
              step={1}
              label="Steps"
              defaultValue={defaultModelState?.steps}
              {...field}
            />
          )}
          defaultValue={20}
          rules={{ required: true }}
        />

        <Controller
          name="model.cfg_scale"
          control={control}
          defaultValue={selectedModelState?.isFlux ? 1 : 4}
          // rules={{ required: true }}
          render={({ field }) => (
            <Slider
              step={0.1}
              min={1}
              max={32}
              label="CFG Scale"
              defaultValue={defaultModelState?.cfg_scale}
              {...field}
            />
          )}
        />
        {selectedModelState?.isFlux && (
          <Controller
            name="model.flux_guidance"
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
        <div className="flex flex-col gap-2">
          <Label>Sampler</Label>
          <Controller
            name="model.sampler_name"
            control={control}
            render={({ field }) => (
              <Select items={samplers} shouldSetDefaultValue {...field} />
            )}
          />
        </div>
        {(backend === "comfy" || schedulers?.length > 0) && (
          <div className="flex flex-col gap-2">
            <Label>Scheduler</Label>
            <Controller
              name="model.scheduler"
              control={control}
              defaultValue="karras"
              render={({ field }) => <Select items={schedulers} {...field} />}
            />
          </div>
        )}
      </div>
      <div className="absolute bottom-0 right-0">
        <Button className="shadow-black/30 shadow-md" type="submit">
          Save
        </Button>
      </div>
    </form>
  );
};

export default ModelsSection;
