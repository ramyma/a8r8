import { Controller, SubmitHandler, useForm } from "react-hook-form";
import Button from "../components/Button";
import Input from "../components/Input";
import Label from "../components/Label";
import Link from "../components/Link";
import Modal, { ModalProps } from "../components/Modal";
import ScrollArea from "../components/ScrollArea";
import useSocket from "../hooks/useSocket";
import { useLayoutEffect, useState } from "react";
import useModels from "../hooks/useModels";
import { ModelSelect, VaeSelect } from "../App";
import Slider from "../components/Slider";
import Select from "../components/Select";
import useBackend from "../hooks/useBackend";
import useSamplers from "../hooks/useSamplers";
import useSchedulers from "../hooks/useSchedulers";
import { getModelWithParams } from "../utils";
import ClipModelMultiSelect from "../MainForm/ClipModelMultiSelect";
import useOptions from "../hooks/useOptions";
type Props = ModalProps;

type ConfigFormValues = {
  civit: {
    api_token: string;
  };
  model: {
    vae: string;
    clip_models?: string[];
    clip_skip?: number;
    steps: number;
    cfg_scale: number;
    flux_guidance: number;
    sampler_name: string;
    scheduler: string;
  };
};

const SettingsModal = ({ open, ...props }: Props) => {
  const { sendCivitMessage, sendMessage, sendMessageAndReceive } = useSocket();
  const [activeSection, setActiveSection] = useState("models");

  const { backend } = useBackend();
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
    selectedClipModels,
  } = useModels();

  const [selectedModelState, setSelectedModelState] =
    useState<typeof selectedModel>();

  const [prevOpen, setPrevOpen] = useState<boolean>();
  const [prevSelectedModel, setPrevSelectedModel] =
    useState<typeof selectedModelState>();

  const loadModelData = async (modelName: string) => {
    const modelConfig = await loadModelConfig(modelName);

    setDefaultModelState(modelConfig ?? undefined);
    modelConfig && setValue("model", modelConfig);
  };

  if (selectedModelState?.name !== prevSelectedModel?.name) {
    setPrevSelectedModel(selectedModelState);
    selectedModelState?.name && loadModelData(selectedModelState.name);
  }

  useLayoutEffect(() => {
    if (prevOpen !== open) {
      setPrevOpen(open);
      if (open && selectedModelState?.name !== selectedModel?.name)
        setSelectedModelState(selectedModel);
    }
  }, [prevOpen, open, selectedModel, selectedModelState]);

  const { refetch: refetchOptions } = useOptions();

  const [defaultModelState, setDefaultModelState] =
    useState<ConfigFormValues["model"]>();

  const allowsAutomaticVae =
    !selectedModelState?.isFlux && !selectedModelState?.isSd35;

  const { control, handleSubmit, setValue } = useForm<ConfigFormValues>({
    shouldUnregister: true,
    defaultValues: {
      model: defaultModelState || {
        vae: (selectedVae ?? allowsAutomaticVae) ? undefined : "Automatic",
        clip_models: [],
      },
      civit: { api_token: "" },
    },
  });

  const onSubmit: SubmitHandler<ConfigFormValues> = async (params) => {
    if (activeSection === "civit") {
      sendCivitMessage("civit_store_config", params.civit);
    } else if (activeSection === "models") {
      sendMessage("store_model_config", {
        name: selectedModelState?.name,
        backend,
        config: params.model,
      });
    }
  };

  // useEffect(() => {
  //   !selectedModelState && setSelectedModelState(selectedModel);
  // }, [selectedModel, selectedModelState]);

  return (
    <Modal
      disableScroll
      open={open}
      {...props}
      className={
        "h-full flex flex-col justify-between gap-4 items-baseline p-0"
      }
      containerClassName="w-[70vw]"
      scroll={false}
    >
      <div className="flex flex-1 w-full relative overflow-hidden">
        <div className="bg-neutral-950 border-neutral-900/60 border-r flex-1 flex-shrink-0 p-5 overflow-hidden">
          <ScrollArea className="text-start">
            <div className="flex flex-col gap-3">
              {/* <Link onClick={() => setActiveSection("cviit")}>Civit</Link> */}
              <h3 className="text-lg text-neutral-200">Settings</h3>
              <Link
                onClick={() => setActiveSection("models")}
                className="text-sm text-neutral-100 hover:text-neutral-200 "
              >
                Models
              </Link>
            </div>
          </ScrollArea>
        </div>
        <div className="flex flex-col flex-[7]  bg-neutral-950/80 flex-shrink-0 text-start">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="relative flex-1 h-full"
          >
            <ScrollArea className="flex flex-col content-start" type="scroll">
              <div className="h-full flex-1 flex-shrink flex-grow-0 p-7">
                {activeSection == "civit" && (
                  <Label className="flex flex-col gap-2">
                    API Token
                    <Controller
                      name="civit.api_token"
                      control={control}
                      render={({ field }) => (
                        <Input type="password" {...field} />
                      )}
                    />
                  </Label>
                )}
                {activeSection == "models" && (
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
                    {(selectedModelState?.isFlux ||
                      selectedModelState?.isSd35) && (
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
                          <Label
                            htmlFor="clip_skip"
                            className="whitespace-nowrap"
                          >
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
                                onChange={(event) =>
                                  field.onChange(+event.target.value)
                                }
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
                          <Select
                            items={samplers}
                            shouldSetDefaultValue
                            {...field}
                          />
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
                          render={({ field }) => (
                            <Select items={schedulers} {...field} />
                          )}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
            <div className="absolute bottom-4 right-4">
              <Button className="shadow-black/30 shadow-md" type="submit">
                Save
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Modal>
  );
};

export default SettingsModal;
