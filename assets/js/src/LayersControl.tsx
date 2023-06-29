import {
  EyeNoneIcon,
  EyeOpenIcon,
  MaskOffIcon,
  MaskOnIcon,
  TrashIcon,
  ValueNoneIcon,
} from "@radix-ui/react-icons";
import {
  ActionCreatorWithoutPayload,
  ActionCreatorWithPayload,
} from "@reduxjs/toolkit";
import debounce from "lodash.debounce";
import React, { ChangeEvent, MouseEvent, ReactNode, useContext } from "react";
import Checkbox from "./components/Checkbox";
import Toggle from "./components/Toggle";
import RefsContext from "./context/RefsContext";
import { useAppDispatch, useAppSelector } from "./hooks";
import useControlnet from "./hooks/useControlnet";
import {
  ControlnetLayer,
  selectControlnetLayers,
  updateControlnetLayer,
} from "./state/controlnetSlice";
import {
  selectActiveLayer,
  setActiveLayer,
  selectIsSketchLayerVisible,
  toggleSketchLayerVisibility,
  selectIsMaskLayerVisible,
  toggleMaskLayerVisibility,
  selectIsMaskLayerEnabled,
  selectIsSketchLayerEnabled,
  toggleMaskLayerIsEnabled,
  toggleSketchLayerIsEnabled,
  ActiveLayer,
} from "./state/layersSlice";
import Slider from "./components/Slider";
import ScrollArea from "./components/ScrollArea";
import Select from "./components/Select";
import Label from "./components/Label";
import { Button } from "@radix-ui/react-toolbar";
import { selectInvertMask, toggleInvertMask } from "./state/canvasSlice";
import { emitCustomEvent } from "react-custom-events";
import {
  emitClearBaseImages,
  emitClearLayerLines,
} from "./Canvas/hooks/useCustomEventsListener";

type LayerProps = {
  id: ActiveLayer;
  name: string;
  subtitle?: string;
  isVisible: boolean;
  isEnabled?: boolean;
  isActive?: boolean;
  visiblitiyActionCreatorPayload?: any;
  visiblitiyActionCreator?:
    | ActionCreatorWithoutPayload
    | ActionCreatorWithPayload<LayerProps["visiblitiyActionCreatorPayload"]>;
  isEnabledActionCreatorPayload?: any;
  isEnabledActionCreator?:
    | ActionCreatorWithoutPayload
    | ActionCreatorWithPayload<LayerProps["isEnabledActionCreatorPayload"]>;
  actions?: ReactNode[];
};

const LayerItem = ({
  id,
  visiblitiyActionCreator,
  visiblitiyActionCreatorPayload,
  isEnabledActionCreator,
  isEnabledActionCreatorPayload,
  name,
  subtitle,
  isVisible,
  isEnabled,
  isActive,
  actions,
}: LayerProps) => {
  const dispatch = useAppDispatch();
  const toggleVisibility = () => {
    // e?.stopPropagation();
    visiblitiyActionCreator &&
      dispatch(visiblitiyActionCreator(visiblitiyActionCreatorPayload));
  };
  const toggleIsEnabled = (e: MouseEvent) => {
    e?.stopPropagation();
    isEnabledActionCreator &&
      dispatch(isEnabledActionCreator(isEnabledActionCreatorPayload));
  };
  const handleClick = () => {
    !isActive && dispatch(setActiveLayer(id));
  };

  // TODO: integrate controlnet values from png info on paste or drop.
  return (
    <li
      className={
        "flex flex-row p-3 items-center justify-between gap-2 " +
        `${
          isActive
            ? "bg-gray-200/80 text-black"
            : "odd:bg-[#222222]/80 even:bg-[#2b2b2b]/80 cursor-pointer"
        }`
      }
      onClick={handleClick}
    >
      <div className="flex flex-col">
        <span>{name}</span>
        <span className="text-sm">{subtitle}</span>
      </div>
      <div className="flex">
        {actions?.map((Action, index) => Action)}

        {!!visiblitiyActionCreator && (
          // <div onClick={toggleVisibility}>{`${isVisible}`}</div>
          <Toggle
            pressed={isVisible}
            onChange={toggleVisibility}
            title="Show/Hide"
            pressedIconComponent={EyeOpenIcon}
            unpressedIconComponent={EyeNoneIcon}
          />
        )}
        {!!isEnabledActionCreator && (
          <Checkbox checked={isEnabled} onClick={toggleIsEnabled} title="Use" />
        )}
        {/* <div>add</div> */}
      </div>
    </li>
  );
};

const CONTROL_MODES = [
  { value: 0, label: "Balanced" },
  { value: 1, label: "My prompt is more important" },
  { value: 2, label: "ControlNet is more important" },
];

const LayersControl = () => {
  // const mode = useAppSelector(selectMode);
  // const tool = useAppSelector(selectTool);

  const dispatch = useAppDispatch();
  const isSketchLayerVisible = useAppSelector(selectIsSketchLayerVisible);
  const isSketchLayerEnabled = useAppSelector(selectIsSketchLayerEnabled);
  const isMaskLayerVisible = useAppSelector(selectIsMaskLayerVisible);
  const isMaskLayerEnabled = useAppSelector(selectIsMaskLayerEnabled);
  const invertMask = useAppSelector(selectInvertMask);

  // const isControlnetLayerVisible = useAppSelector(
  //   selectIsControlnetLayerVisible
  // );
  const activeLayerId = useAppSelector(selectActiveLayer);

  const controlnetArgs = useAppSelector(selectControlnetLayers);

  const { controlnet_models, controlnet_modules, controlnetDetect } =
    useControlnet();

  // const { register, handleSubmit, setValue } = useForm();

  const controlnetLayers: LayerProps[] = controlnetArgs.map(
    ({ isEnabled, isVisible, module, id }, index) => ({
      id: `controlnet${id as string}`,
      isEnabled,
      name: `Controlnet ${index + 1}`,
      subtitle: `${module?.toLowerCase() != "none" ? module : ""}`,
      isEnabledActionCreator: updateControlnetLayer,
      isEnabledActionCreatorPayload: {
        layerId: id,
        isEnabled: !controlnetArgs[index].isEnabled,
      },
      isVisible: isVisible as boolean,
      visiblitiyActionCreator: updateControlnetLayer,
      visiblitiyActionCreatorPayload: {
        layerId: id,
        isVisible: !controlnetArgs[index].isVisible,
      },
      actions: [
        <LayerActionButton
          key="clearImage"
          onClick={() => {
            dispatch(
              updateControlnetLayer({
                layerId: id,
                image: undefined,
                detectionImage: undefined,
              })
            );
          }}
          title="Clear Image"
          type="clearImage"
        />,
        //TODO: Add clear lines button for CN layers
        <LayerActionButton
          key="clearLines"
          onClick={() =>
            emitClearLayerLines(("controlnet" + id) as ActiveLayer)
          }
          title="Clear Lines"
          type="clearLines"
        />,
      ],
    })
  );

  const layers: LayerProps[] = [
    {
      id: "base",
      name: "Base",
      isVisible: true,
      // actionCreator: toggleSketchLayerVisibility,
      actions: [
        <LayerActionButton
          key="clearImages"
          onClick={() => {
            emitClearBaseImages();
          }}
          title="Clear Images"
          type="clearImage"
        />,
      ],
    },
    {
      id: "mask",
      name: "Mask",
      isVisible: isMaskLayerVisible,
      visiblitiyActionCreator: toggleMaskLayerVisibility,
      actions: [
        <Toggle
          key="invertMask"
          pressedIconComponent={MaskOnIcon}
          unpressedIconComponent={MaskOffIcon}
          pressed={invertMask}
          onChange={() => {
            dispatch(toggleInvertMask());
          }}
          title="Invert Mask"
          className="data-[state=on]:text-primary hover:!border-inherit"
        />,
        <LayerActionButton
          key="clearMask"
          onClick={() => {
            emitClearLayerLines("mask");
          }}
          title="Clear Mask"
          type="clearLines"
        />,
      ],
    },
    {
      id: "sketch",
      name: "Sketch",
      isVisible: isSketchLayerVisible,
      visiblitiyActionCreator: toggleSketchLayerVisibility,
      actions: [
        <LayerActionButton
          key="clearSketch"
          onClick={() => {
            emitClearLayerLines("sketch");
          }}
          title="Clear Sketch"
          type="clearLines"
        />,
      ],
    },
    ...controlnetLayers,
  ];

  // const handleSketchLayerToggle = () => {
  //   dispatch(toggleSketchLayerVisibility());
  // };

  // const handleControlnetLayerToggle = () => {
  //   dispatch(toggleControlnetLayerVisibility());
  // };
  // const handleModeChange = (e: ChangeEvent<HTMLSelectElement>) => {
  //   const value = e.target.value as Mode;
  //   dispatch(setMode(value));
  // };
  // const handleToolChange = (e: ChangeEvent<HTMLSelectElement>) => {
  //   const value = e.target.value as Tool;
  //   dispatch(setTool(value));
  // };
  const handleControlnetSelectChange = ({ name, value, layerId, type }) => {
    const controlnetModuleSliders =
      (name === "module" &&
        controlnet_modules.find((module) => module.name === value)?.sliders) ||
      [];

    dispatch(
      updateControlnetLayer({
        layerId,
        [name]: type === "number" ? +value : value,
        ...(name === "module" &&
          controlnetModuleSliders && {
            threshold_a: controlnetModuleSliders[1]?.value,
            threshold_b: controlnetModuleSliders[2]?.value,
          }),
      })
    );
  };
  const handleControlnetChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    layerId: ControlnetLayer["id"]
  ) => {
    const { value, name, type } = e.target;
    // if (name === "isEnabled") {
    //   dispatch(
    //     updateControlnetLayer({
    //       index,
    //       isEnabled: !controlnetArgs[index].isEnabled,
    //     })
    //   );
    // } else {
    if (type === "checkbox") {
      const { checked } = e.target as HTMLInputElement;
      dispatch(
        updateControlnetLayer({
          layerId,
          [name]: checked,
        })
      );
    } else {
      const controlnetModuleSliders =
        (name === "module" &&
          controlnet_modules.find((module) => module.name === value)
            ?.sliders) ||
        [];

      dispatch(
        updateControlnetLayer({
          layerId,
          [name]: type === "number" ? +value : value,
          ...(name === "module" &&
            controlnetModuleSliders && {
              threshold_a: controlnetModuleSliders[1]?.value,
              threshold_b: controlnetModuleSliders[2]?.value,
            }),
        })
      );
    }
    // }
  };

  const handleControlnetAttrsChange = (
    name: string,
    value: number | boolean | string,
    layerId: ControlnetLayer["id"]
  ) => {
    dispatch(
      updateControlnetLayer({
        layerId,
        [name]: value,
      })
    );
  };

  const handleControlnetDetect = debounce(() => {
    if (activeControlnetLayer) {
      const {
        module,
        processor_res,
        threshold_a,
        threshold_b,
        pixel_perfect,
        id,
      } = activeControlnetLayer;
      // TODO: override res with selection box dims when pixel perfect is on
      controlnetDetect({
        module,
        processor_res,
        threshold_a,
        threshold_b,
        layerId: id,
        pixel_perfect,
      });
    }
  }, 0);

  const activeControlnetLayer = activeLayerId.startsWith("controlnet")
    ? controlnetArgs.find(
        (arg) => arg.id === activeLayerId.replace("controlnet", "")
      )
    : null;

  const controlnetModuleSliders = controlnet_modules?.find(
    ({ name }) => name === activeControlnetLayer?.module
  )?.sliders;

  return (
    <div className="flex flex-col gap-2 absolute right-0 top-0 bg-black/90 w-[15vw] md:w-[20vw] p-4 rounded backdrop-blur-sm select-none overflow-hidden ">
      {/* <div className="flex flex-row gap-4">
        <div className="flex gap-2">
          <Label htmlFor="mode">Mode</label>
          <select
            name="mode"
            id="mode"
            value={mode}
            onChange={handleModeChange}
          >
            <option value="selection">Selection</option>
            <option value="paint">Paint</option>
          </select>
        </div>
        <div className="flex gap-2">
          <Label htmlFor="tool">Tool</label>
          <select
            name="tool"
            id="tool"
            value={tool}
            onChange={handleToolChange}
          >
            <option value="brush">Brush</option>
            <option value="eraser">Eraser</option>
          </select>
        </div>
      </div> */}

      {/* <Label htmlFor="toggleControlentLayer">
        Controlnet Layer
        <input
          className="ml-2"
          type="checkbox"
          name="toggleControlentLayer"
          id="toggleControlentLayer"
          onChange={handleControlnetLayerToggle}
          checked={isControlnetLayerVisible}
        />
      </Label> */}

      <h3 className="font-bold">Layers</h3>
      <ul className="flex flex-col w-full mt-2 rounded overflow-hidden">
        {/* TODO: animate layer on undo/redo to signal which layer was affected */}
        {layers.map(({ id, ...rest }) => (
          <LayerItem
            key={id}
            id={id}
            isActive={activeLayerId === id}
            {...rest}
          />
        ))}
      </ul>

      <div>
        {/* <Label htmlFor={`enabled${controlnetLayer.id}`}>
            Controlnet Layer {i + 1}
            <input
              className="ml-2"
              type="checkbox"
              name="isEnabled"
              id={`enabled${controlnetLayer.id}`}
              checked={controlnetLayer.isEnabled}
              onChange={(e) => handleControlnetChange(e, i)}
            />
          </Label> */}
        {activeControlnetLayer?.isEnabled && (
          <ScrollArea classNames="px-2">
            <div className="flex gap-5 flex-col mt-2 h-[40vh]  pt-1 pl-1.5 pr-2.5">
              <div className="flex gap-2 flex-col">
                <Label htmlFor={`module${activeControlnetLayer?.id}`}>
                  Controlnet Preprocessor
                </Label>
                {/* <select
                  className="p-2 rounded"
                  name="module"
                  id={`module${activeControlnetLayer?.id}`}
                  onChange={async (e) =>
                    handleControlnetChange(
                      e,
                      +activeLayerId.replace("controlnet", "") - 1
                    )
                  }
                  value={activeControlnetLayer?.module}
                >
                  {controlnet_modules?.map((controlnet_module) => (
                    <option
                      key={controlnet_module.name}
                      value={controlnet_module.name}
                    >
                      {controlnet_module.name}
                    </option>
                  ))}
                </select> */}
                <Select
                  name="module"
                  items={controlnet_modules}
                  textAttr="name"
                  valueAttr="name"
                  value={activeControlnetLayer?.module}
                  onChange={(value) =>
                    handleControlnetSelectChange({
                      name: "module",
                      type: "text",
                      value,
                      layerId: activeControlnetLayer.id,
                    })
                  }
                />
              </div>
              <div className="flex gap-2 h-full flex-col">
                <Label htmlFor={`model${activeControlnetLayer?.id}`}>
                  Controlnet Model
                </Label>
                {/* <select
                  className="p-2 rounded"
                  name="model"
                  id={`model${activeControlnetLayer?.id}`}
                  onChange={(e) =>
                    handleControlnetChange(
                      e,
                      +activeLayerId.replace("controlnet", "") - 1
                    )
                  }
                  value={activeControlnetLayer?.model}
                >
                  <option value="none">none</option>
                  {controlnet_models?.map((controlnet_model) => (
                    <option key={controlnet_model} value={controlnet_model}>
                      {controlnet_model}
                    </option>
                  ))}
                </select> */}
                <Select
                  name="model"
                  id={`model${activeControlnetLayer?.id}`}
                  items={["none", ...(controlnet_models ?? [])]}
                  value={activeControlnetLayer?.model}
                  onChange={(value) =>
                    handleControlnetSelectChange({
                      name: "model",
                      type: "text",
                      value,
                      layerId: activeControlnetLayer.id,
                    })
                  }
                />
              </div>

              {/* <div className="flex gap-2"> */}
              {/* <Label htmlFor={`weight${activeControlnetLayer?.id}`}>
                    Controlnet Weight
                  </Label> */}
              {/* <input
                name="weight"
                id={`weight${activeControlnetLayer?.id}`}
                type="number"
                step={0.01}
                onChange={(e) =>
                  handleControlnetChange(
                    e,
                    +activeLayerId.replace("controlnet", "") - 1
                    )
                  }
                  value={activeControlnetLayer?.weight}
                /> */}
              {/* </div> */}
              <div className="flex gap-2 flex-col">
                <Label htmlFor={`module${activeControlnetLayer?.id}`}>
                  Control Mode
                </Label>
                {/* <select
                  className="p-2 rounded"
                  name="control_mode"
                  id={`module${activeControlnetLayer?.id}`}
                  onChange={async (e) =>
                    handleControlnetChange(
                      e,
                      +activeLayerId.replace("controlnet", "") - 1
                    )
                  }
                  value={activeControlnetLayer?.control_mode}
                >
                  {CONTROL_MODES?.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select> */}
                <Select
                  name="model"
                  id={`module${activeControlnetLayer?.id}`}
                  items={CONTROL_MODES}
                  value={activeControlnetLayer?.control_mode}
                  onChange={(value) =>
                    handleControlnetSelectChange({
                      name: "control_mode",
                      type: "number",
                      value,
                      layerId: activeControlnetLayer.id,
                    })
                  }
                />
              </div>

              <Slider
                label="Controlnet Weight"
                min={0}
                max={2}
                step={0.01}
                onChange={(value) =>
                  handleControlnetAttrsChange(
                    "weight",
                    value,
                    activeControlnetLayer.id
                  )
                }
                value={activeControlnetLayer?.weight}
              />
              {/* <div className="flex gap-2"> */}
              {/* <Label htmlFor={`guidanceStart${activeControlnetLayer?.id}`}>
                Guidance Start
              </Label>
              <input
                name="guidance_start"
                id={`guidanceStart${activeControlnetLayer?.id}`}
                type="number"
                step={0.1}
                onChange={(e) =>
                  handleControlnetChange(
                    e,
                    +activeLayerId.replace("controlnet", "") - 1
                  )
                }
                value={activeControlnetLayer?.guidance_start}
              /> */}
              {/* </div> */}
              <Slider
                label="Guidance Start"
                min={0}
                max={1}
                step={0.1}
                onChange={(value) =>
                  handleControlnetAttrsChange(
                    "guidance_start",
                    value,
                    activeControlnetLayer.id
                  )
                }
                value={activeControlnetLayer?.guidance_start}
              />
              {/* <div className="flex gap-2"> */}
              {/* <Label htmlFor={`guidanceEnd${activeControlnetLayer?.id}`}>
                Guidance End
              </Label>
              <input
                name="guidance_end"
                id={`guidanceEnd${activeControlnetLayer?.id}`}
                type="number"
                step={0.1}
                onChange={(e) =>
                  handleControlnetChange(
                    e,
                    +activeLayerId.replace("controlnet", "") - 1
                  )
                }
                value={activeControlnetLayer?.guidance_end}
              /> */}
              {/* </div> */}
              <Slider
                label="Guidance End"
                min={0}
                max={1}
                step={0.1}
                onChange={(value) =>
                  handleControlnetAttrsChange(
                    "guidance_end",
                    value,
                    activeControlnetLayer.id
                  )
                }
                value={activeControlnetLayer?.guidance_end}
              />
              {/* <div className="flex gap-2">
                <Label htmlFor={`processorRes${activeControlnetLayer?.id}`}>
                Processor Resolution
              </Label>
              <input
                name="processor_res"
                id={`processorRes${activeControlnetLayer?.id}`}
                type="number"
                step={1}
                onChange={(e) =>
                  handleControlnetChange(
                    e,
                    +activeLayerId.replace("controlnet", "") - 1
                  )
                }
                value={activeControlnetLayer?.processor_res}
              />
              </div> */}
              {!activeControlnetLayer?.pixel_perfect && (
                <Slider
                  label="Processor Resolution"
                  min={256}
                  max={4096}
                  step={1}
                  onChange={(value) =>
                    handleControlnetAttrsChange(
                      "processor_res",
                      value,
                      activeControlnetLayer.id
                    )
                  }
                  value={activeControlnetLayer?.processor_res ?? 512}
                />
              )}
              {/* <div className="flex gap-2">
              <Label htmlFor={`thresholdA${activeControlnetLayer?.id}`}>
                Threshold A
              </Label>
              <input
                name="threshold_a"
                id={`thresholdA${activeControlnetLayer?.id}`}
                type="number"
                step={0.1}
                onChange={(e) =>
                  handleControlnetChange(
                    e,
                    +activeLayerId.replace("controlnet", "") - 1
                  )
                }
                value={activeControlnetLayer?.threshold_a}
              />
            </div> */}
              {activeControlnetLayer?.module !== "none" &&
                controlnetModuleSliders && (
                  <>
                    {controlnetModuleSliders[1] && (
                      <Slider
                        label={controlnetModuleSliders[1].name} //"Threshold A"
                        min={controlnetModuleSliders[1].min}
                        max={controlnetModuleSliders[1].max}
                        step={0.1}
                        onChange={(value) =>
                          handleControlnetAttrsChange(
                            "threshold_a",
                            value,
                            activeControlnetLayer.id
                          )
                        }
                        value={activeControlnetLayer?.threshold_a ?? 0}
                      />
                    )}
                    {/* <div className="flex gap-2">
              <Label htmlFor={`thresholdB${activeControlnetLayer?.id}`}>
                Threshold B
              </Label>
              <input
                name="threshold_b"
                id={`thresholdB${activeControlnetLayer?.id}`}
                type="number"
                step={0.1}
                onChange={(e) =>
                  handleControlnetChange(
                    e,
                    +activeLayerId.replace("controlnet", "") - 1
                  )
                }
                value={activeControlnetLayer?.threshold_b}
              />
            </div> */}
                    {controlnetModuleSliders[2] && (
                      <Slider
                        label={controlnetModuleSliders[2].name} //"Threshold B"
                        min={controlnetModuleSliders[2].min}
                        max={controlnetModuleSliders[2].max}
                        step={0.1}
                        onChange={(value) =>
                          handleControlnetAttrsChange(
                            "threshold_b",
                            value,
                            activeControlnetLayer.id
                          )
                        }
                        value={activeControlnetLayer?.threshold_b ?? 0}
                      />
                    )}
                  </>
                )}
              {/* <div className="flex gap-2">
              <input
                name="overrideBaseLayer"
                id={`overrideBaseLayer${activeControlnetLayer?.id}`}
                type="checkbox"
                onChange={(e) =>
                  handleControlnetChange(
                    e,
                    +activeLayerId.replace("controlnet", "") - 1
                  )
                }
                checked={activeControlnetLayer?.overrideBaseLayer}
              />
            </div> */}

              <Checkbox
                id={`pixel_perfect${activeControlnetLayer?.id}`}
                checked={activeControlnetLayer?.pixel_perfect}
                onChange={(value) =>
                  handleControlnetAttrsChange(
                    "pixel_perfect",
                    value,
                    activeControlnetLayer.id
                  )
                }
              >
                Pixel Perfect
              </Checkbox>
              <Checkbox
                id={`lowvram${activeControlnetLayer?.id}`}
                checked={activeControlnetLayer?.lowvram}
                onChange={(value) =>
                  handleControlnetAttrsChange(
                    "lowvram",
                    value,
                    activeControlnetLayer.id
                  )
                }
              >
                Low VRAM
              </Checkbox>
              <Checkbox
                id={`overrideBaseLayer${activeControlnetLayer?.id}`}
                checked={activeControlnetLayer?.overrideBaseLayer}
                onChange={(value) =>
                  handleControlnetAttrsChange(
                    "overrideBaseLayer",
                    value,
                    activeControlnetLayer.id
                  )
                }
              >
                Override Base Layer
              </Checkbox>

              <button
                className="sticky bottom-0 z-2 text-sm shadow-md shadow-black/30 border border-neutral-700 rounded"
                onClick={handleControlnetDetect}
              >
                Detect
              </button>
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
};

export default LayersControl;

const LayerActionButton = ({
  onClick,
  title,
  type,
}: {
  onClick: (MouseEvent) => void;
  title?: string;
  type: "clearLines" | "clearImage";
}) => {
  return (
    <button
      key="clearMask"
      className="bg-transparent flex h-[35px] w-[35px] items-center justify-center rounded text-base leading-4 p-0"
      onClick={(e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onClick(e);
      }}
      title={title}
    >
      {type === "clearLines" ? (
        <TrashIcon />
      ) : type === "clearImage" ? (
        <ValueNoneIcon />
      ) : null}
    </button>
  );
};
