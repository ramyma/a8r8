import {
  ArrowDownIcon,
  ArrowUpIcon,
  EraserIcon,
  EyeNoneIcon,
  EyeOpenIcon,
  MaskOffIcon,
  MaskOnIcon,
  PlusIcon,
  TrashIcon,
  ViewNoneIcon,
} from "@radix-ui/react-icons";
import {
  ActionCreatorWithoutPayload,
  ActionCreatorWithPayload,
} from "@reduxjs/toolkit";
import debounce from "lodash.debounce";
import React, {
  ChangeEvent,
  DragEventHandler,
  MouseEvent,
  MouseEventHandler,
  ReactNode,
  useMemo,
  useRef,
  useState,
} from "react";
import * as Portal from "@radix-ui/react-portal";
import { v4 as uuid4 } from "uuid";
import Checkbox from "./components/Checkbox";
import Toggle from "./components/Toggle";
import { useAppDispatch, useAppSelector } from "./hooks";
import useControlnet from "./hooks/useControlnet";
import {
  CONTROL_MODES,
  ControlnetLayer,
  addControlnetLayer,
  removeControlnetLayer,
  selectControlnetLayerById,
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
  ActiveLayer,
} from "./state/layersSlice";
import Slider from "./components/Slider";
import ScrollArea from "./components/ScrollArea";
import Select from "./components/Select";
import Label from "./components/Label";
import { selectInvertMask, toggleInvertMask } from "./state/canvasSlice";
import {
  emitClearBaseImages,
  emitClearLayerLines,
  emitImageDropEvent,
} from "./Canvas/hooks/useCustomEventsListener";
import useScripts from "./hooks/useScripts";
import { selectBackend } from "./state/optionsSlice";
import ImageUploader from "./components/ImageUploader";
import ColorPicker, { ColorPickerProps } from "./ColorPicker";
import {
  decrementOrder,
  incrementOrder,
  removePromptRegionLayer,
  selectIsRegionalPromptsEnabled,
  selectPromptRegionLayerById,
  selectPromptRegionLayers,
  selectPromptRegionLayersCount,
  setPreviewLayerId,
  updatePromptRegionLayer,
} from "./state/promptRegionsSlice";
import Button from "./components/Button";
import { weightTypesByName } from "./MainForm/constants";
import { checkIsIpAdapterControlnetModel } from "./utils";
import Switch from "./Switch";

const WEIGHT_TYPES = Object.keys(weightTypesByName);

type LayerProps = {
  id: ActiveLayer;
  subId?: string;
  index?: number;
  name: string;
  subtitle?: string;
  isVisible: boolean;
  isEnabled?: boolean;
  isActive?: boolean;
  visibilityActionCreatorPayload?: any;
  visibilityActionCreator?:
    | ActionCreatorWithoutPayload
    | ActionCreatorWithPayload<LayerProps["visibilityActionCreatorPayload"]>;
  isEnabledActionCreatorPayload?: any;
  isEnabledActionCreator?:
    | ActionCreatorWithoutPayload
    | ActionCreatorWithPayload<LayerProps["isEnabledActionCreatorPayload"]>;
  actions?: ReactNode[];
  type: "base" | "mask" | "sketch" | "controlnet" | "regionMask";
};

const LayerItem = ({
  id,
  activeLayerId,
  subId,
  index,
  type,
  visibilityActionCreator,
  visibilityActionCreatorPayload,
  isEnabledActionCreator,
  isEnabledActionCreatorPayload,
  name,
  subtitle,
  isVisible,
  isEnabled,
  isActive,
  actions,
}: LayerProps & { activeLayerId: ActiveLayer }) => {
  const itemRef = useRef<HTMLLIElement>(null);

  const dispatch = useAppDispatch();
  const backend = useAppSelector(selectBackend);
  const controlnetLayer = useAppSelector((state) =>
    selectControlnetLayerById(state, subId)
  );
  const regionMaskLayer = useAppSelector((state) =>
    selectPromptRegionLayerById(state, subId)
  );
  const regionMaskLayersCount = useAppSelector(selectPromptRegionLayersCount);

  //TODO: remove hardcoding for -mask and controlnet to extract and construct layer id
  const isMaskLayerActive =
    type === "controlnet" &&
    activeLayerId.endsWith("mask") &&
    activeLayerId.replace(/((-mask)|controlnet)/g, "") === controlnetLayer?.id;
  //TOOD: add animation on update; like drop or any change of the layer data

  const [dragOver, setDragOver] = useState(false);
  const [isImagePreviewVisible, setIsImagePreviewVisible] = useState(false);

  const toggleVisibility = () => {
    // e?.stopPropagation();
    visibilityActionCreator &&
      dispatch(visibilityActionCreator(visibilityActionCreatorPayload));
  };
  const toggleIsEnabled = (_event: MouseEvent) => {
    isEnabledActionCreator &&
      dispatch(isEnabledActionCreator(isEnabledActionCreatorPayload));
  };
  const handleClick = () => {
    (!isActive || isMaskLayerActive) && dispatch(setActiveLayer(id));
  };
  const handleMaskLayerClick = () => {
    dispatch(setActiveLayer((id + "-mask") as ActiveLayer));
  };

  const handleDragOver: DragEventHandler<HTMLLIElement> = () => {
    setDragOver(true);
  };

  const handleDragExit = (e) => {
    e.stopPropagation();
    e.preventDefault();

    setDragOver(false);
  };

  const handleDrop: DragEventHandler<HTMLLIElement> = (e) => {
    e.stopPropagation();
    e.preventDefault();

    setDragOver(false);

    if (e.dataTransfer) {
      const files = e.dataTransfer.files; // Array of all files

      for (let i = 0, file; (file = files[i]); i++) {
        if (file.type.match(/image.*/)) {
          const reader = new FileReader();

          reader.onload = async (e) => {
            // finished reading file data.
            if (e.target) {
              const dataUrl = e.target.result;
              if (typeof dataUrl === "string") {
                if (type === "base") {
                  emitImageDropEvent({ imageDataUrl: dataUrl });
                }
                if (type === "controlnet")
                  dispatch(
                    updateControlnetLayer({
                      layerId: subId,
                      image: dataUrl,
                    })
                  );
              }
            }
          };

          reader.readAsDataURL(file); // start reading the file data.
        }
      }
    }
  };

  const handleMouseEnter: MouseEventHandler = () => {
    if (type === "controlnet") setIsImagePreviewVisible(true);
    if (type === "regionMask") dispatch(setPreviewLayerId(subId));
  };

  const handleMouseLeave: MouseEventHandler = () => {
    if (type === "controlnet") setIsImagePreviewVisible(false);
    if (type === "regionMask") dispatch(setPreviewLayerId());
  };

  const handleMaskColorChange = (color) => {
    type === "controlnet" &&
      dispatch(
        updateControlnetLayer({
          layerId: id.replace(/((-mask)|controlnet)/g, ""),
          maskColor: color,
        })
      );
    type === "regionMask" &&
      dispatch(
        updatePromptRegionLayer({
          layerId: id.replace("regionMask", ""),
          maskColor: color,
        })
      );
  };

  const handleMoveUpClick: MouseEventHandler = (event) => {
    event.stopPropagation();
    dispatch(decrementOrder(subId ?? ""));
  };

  const moveDownClick: MouseEventHandler = (event) => {
    event.stopPropagation();
    dispatch(incrementOrder(subId ?? ""));
  };

  return (
    <>
      {/* {isColorPickerVisible && ( */}

      {/* )} */}
      {/* // FIXME: width on smaller window size */}
      <li
        ref={itemRef}
        {...(isActive && { "data-ui": "active" })}
        className={
          "group grid sm:grid-cols-1 xl:grid-cols-2 xl:items-center flex-row p-1.5 px-2 justify-between gap-1 " +
          `${
            dragOver
              ? "bg-primary/80"
              : isActive && !isMaskLayerActive
                ? "bg-neutral-200/80"
                : "odd:bg-[#222222]/80 even:bg-[#2b2b2b]/80"
          } ` +
          `${isActive && !isMaskLayerActive ? "text-black" : "cursor-pointer"}`
        }
        onClick={handleClick}
        // FIXME: drag over event toggles when hovering over child elements
        onDragOver={handleDragOver}
        onDragLeave={handleDragExit}
        onDrop={handleDrop}
        {...((type === "controlnet" || type === "regionMask") && {
          onMouseEnter: handleMouseEnter,
          onMouseLeave: handleMouseLeave,
        })}
      >
        <div className="absolute left-0 top-0 pointer-events-none w-full h-full" />
        <div className="flex gap-2 2xl:items-center sm:flex-col 2xl:flex-row">
          <div
            className={
              "w-full flex flex-col sm:shrink-[0.6] 2xl:shrink " +
              (type === "controlnet" &&
              controlnetLayer?.isEnabled &&
              controlnetLayer?.overrideBaseLayer
                ? "text-primary"
                : "")
            }
          >
            <span className="text-sm" title={name}>
              {name}
            </span>
            <span className="text-xs truncate" title={subtitle}>
              {subtitle}
            </span>
          </div>

          {type === "regionMask" && (
            <div className="flex gap-2">
              <ColorBox
                color={regionMaskLayer?.maskColor}
                onColorChange={handleMaskColorChange}
              />
              <Button
                variant="clear"
                className="p-1"
                onClick={moveDownClick}
                title="Move Down"
                disabled={index === regionMaskLayersCount - 1}
              >
                <ArrowDownIcon />
              </Button>
              <Button
                variant="clear"
                className="p-1"
                onClick={handleMoveUpClick}
                title="Move Up"
                disabled={index === 0}
              >
                <ArrowUpIcon />
              </Button>
            </div>
          )}
        </div>
        <div className="flex xl:justify-end sm:gap-1 xl:gap-2">
          {actions?.map((Action, _index) => Action)}

          {!!visibilityActionCreator && (
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
            <div className="flex size-[35px] justify-center">
              <Checkbox
                checked={isEnabled}
                onClick={toggleIsEnabled}
                title="Use"
              />
            </div>
          )}
          {/* <div>add</div> */}
        </div>
      </li>
      {type === "controlnet" && isEnabled && (
        <li
          className={`flex text-sm pe-2 ps-5  justify-between items-center cursor-pointe ${
            isMaskLayerActive ? "bg-neutral-50/40" : "bg-neutral-950"
          }`}
          onClick={handleMaskLayerClick}
        >
          <div className="inline-flex gap-2 items-center">
            <div>Mask</div>
            <ColorBox
              color={controlnetLayer?.maskColor}
              onColorChange={handleMaskColorChange}
            />
          </div>

          <div className="flex">
            <LayerActionButton
              type="clearLines"
              onClick={() => {
                emitClearLayerLines((id + "-mask") as ActiveLayer);
              }}
            />
            <Toggle
              pressed={controlnetLayer?.isMaskVisible ?? false}
              onChange={(value) =>
                dispatch(
                  updateControlnetLayer({
                    layerId: controlnetLayer?.id,
                    isMaskVisible: value,
                  })
                )
              }
              title="Show/Hide"
              pressedIconComponent={EyeOpenIcon}
              unpressedIconComponent={EyeNoneIcon}
            />
            <div className="flex size-[35px] justify-center">
              <Checkbox
                checked={controlnetLayer?.isMaskEnabled ?? false}
                onChange={(value) =>
                  dispatch(
                    updateControlnetLayer({
                      layerId: controlnetLayer?.id,
                      isMaskEnabled: value,
                    })
                  )
                }
              />
            </div>
          </div>
        </li>
      )}
      {/* FIXME: preview image not showing when image is dragged to canvas */}
      {controlnetLayer?.image && isImagePreviewVisible && (
        <Portal.Root
          className="absolute"
          style={{
            right:
              document.body.getBoundingClientRect().width -
              (itemRef.current?.getBoundingClientRect()?.left ?? 0) +
              20,
            top: itemRef.current?.getBoundingClientRect().top,
          }}
        >
          <div
            className="rounded-md backdrop-blur-sm bg-black/70 border border-neutral-700/20 shadow-md shadow-black/20"
            style={{
              backgroundImage: `url(${controlnetLayer?.image}`,
              width: 150,
              height: 150,
              backgroundSize: "contain",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
            }}
          />
        </Portal.Root>
      )}
    </>
  );
};

const LayersControl = () => {
  const dispatch = useAppDispatch();
  const isSketchLayerVisible = useAppSelector(selectIsSketchLayerVisible);

  const isMaskLayerVisible = useAppSelector(selectIsMaskLayerVisible);

  const invertMask = useAppSelector(selectInvertMask);
  const backend = useAppSelector(selectBackend);

  const { hasControlnet, hasRegionalPrompting } = useScripts();
  // const isControlnetLayerVisible = useAppSelector(
  //   selectIsControlnetLayerVisible
  // );
  const activeLayerId = useAppSelector(selectActiveLayer);

  const controlnetArgs = useAppSelector(selectControlnetLayers);

  const {
    controlnet_models,
    controlnet_preprocessors,
    controlnetDetect,
    ip_adapter_models,
    ip_adapter_weight_types,
  } = useControlnet();

  // const { register, handleSubmit, setValue } = useForm();

  const controlnetLayers: LayerProps[] = useMemo(
    () =>
      controlnetArgs.map(
        (
          {
            isEnabled,
            isVisible,
            module,
            model,
            id,
            isIpAdapter,
            iPAdapterModel,
            iPAdapterWeightType,
          },
          index
        ) => ({
          id: `controlnet${id as string}`,
          isEnabled,
          name:
            backend === "comfy" && isIpAdapter
              ? `IP Adpater ${index + 1}`
              : `Controlnet ${index + 1}`,
          type: "controlnet",
          subId: id,
          subtitle: `${
            backend === "comfy" && isIpAdapter
              ? iPAdapterWeightType ?? iPAdapterModel
              : module?.toLowerCase() != "none"
                ? module
                : model?.toLowerCase() != "none"
                  ? model
                  : ""
          }`,
          isEnabledActionCreator: updateControlnetLayer,
          isEnabledActionCreatorPayload: {
            layerId: id,
            isEnabled: !controlnetArgs[index].isEnabled,
          },
          isVisible: isVisible as boolean,
          visibilityActionCreator: updateControlnetLayer,
          visibilityActionCreatorPayload: {
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
      ),
    [backend, controlnetArgs, dispatch]
  );

  const promptRegions = useAppSelector(selectPromptRegionLayers);

  const isRegionalPromptsEnabled = useAppSelector(
    selectIsRegionalPromptsEnabled
  );

  const regionMaskLayers: LayerProps[] = promptRegions.map(
    ({ id, isVisible, isEnabled, name, maskColor }, index) => ({
      id: ("regionMask" + id) as ActiveLayer,
      subId: id,
      index,
      isVisible,
      isEnabled,
      visibilityActionCreator: updatePromptRegionLayer,
      visibilityActionCreatorPayload: {
        layerId: id,
        isVisible: !promptRegions[index].isVisible,
      },
      isEnabledActionCreator: updatePromptRegionLayer,
      isEnabledActionCreatorPayload: {
        layerId: id,
        isEnabled: !promptRegions[index].isEnabled,
      },
      name: name || `Region ${index + 1}`,
      maskColor,
      type: "regionMask",
      actions: [
        <LayerActionButton
          key="clearLines"
          onClick={() =>
            emitClearLayerLines(("regionMask" + id) as ActiveLayer)
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
      type: "base",
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
      type: "mask",
      isVisible: isMaskLayerVisible,
      visibilityActionCreator: toggleMaskLayerVisibility,
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
      type: "sketch",
      isVisible: isSketchLayerVisible,
      visibilityActionCreator: toggleSketchLayerVisibility,
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
    ...(hasRegionalPrompting && isRegionalPromptsEnabled
      ? regionMaskLayers
      : []),
    ...(hasControlnet ? controlnetLayers : []),
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
        controlnet_preprocessors.find((module) => module.name === value)
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
          controlnet_preprocessors.find((module) => module.name === value)
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
    name: keyof ControlnetLayer,
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
        overrideBaseLayer,
        image,
      } = activeControlnetLayer;
      controlnetDetect({
        module,
        processor_res,
        threshold_a,
        threshold_b,
        layerId: id,
        pixel_perfect,
        imageDataUrl:
          overrideBaseLayer && image ? (image as string) : undefined,
      });
    }
  }, 0);

  const layerItemsListRef = useRef<HTMLDivElement>(null);
  const handleAddLayer = () => {
    dispatch(addControlnetLayer(uuid4()));
    //TODO: add addition animation
    // layerItemsListRef?.current?.scrollTo(
    //   0,
    //   layerItemsListRef.current.scrollHeight
    // );
  };

  // useEffect(() => {
  //   layerItemsListRef?.current?.scrollTo(
  //     0,
  //     layerItemsListRef.current.scrollHeight
  //   );
  // }, [controlnetLayers]);

  const handleRemoveLayer = () => {
    if (activeControlnetLayer?.id) {
      dispatch(removeControlnetLayer(activeControlnetLayer.id));
      const activeControlnetLayerIndex = +activeLayerId.replace(
        "controlnet",
        ""
      );

      dispatch(
        setActiveLayer(
          activeControlnetLayerIndex === 0
            ? "base"
            : `controlnet${activeControlnetLayerIndex - 1}`
        )
      );
    }
    if (activeRegionMaskLayer?.id) {
      dispatch(removePromptRegionLayer(activeRegionMaskLayer.subId ?? ""));
    }
  };

  const activeControlnetLayer = activeLayerId.startsWith("controlnet")
    ? controlnetArgs.find(
        (arg) =>
          arg.id ===
          activeLayerId.replace("controlnet", "").replace("-mask", "")
      )
    : null;
  const activeRegionMaskLayer = activeLayerId.startsWith("regionMask")
    ? regionMaskLayers.find((layer) => layer.id === activeLayerId)
    : null;

  const controlnetModuleSliders = controlnet_preprocessors?.find(
    ({ name }) => name === activeControlnetLayer?.module
  )?.sliders;

  return (
    <div className="flex flex-col gap-2 absolute right-0 top-0 bg-black/90 w-[15vw] md:w-[20vw] p-4 pe-0 rounded backdrop-blur-sm select-none overflow-hidden transition-all">
      <div className="flex justify-between pt-2">
        <h3 className="sm:flex-1 lg:flex-[3] text-sm font-bold">Layers</h3>
        <div className="flex flex-1 gap-4 sticky top-0 mt-[-8px] pe-1">
          <Button
            className="p-0.5 size-8"
            title="Remove layer"
            onClick={handleRemoveLayer}
            disabled={
              !activeControlnetLayer &&
              (!activeRegionMaskLayer || regionMaskLayers.length <= 2)
            }
          >
            <TrashIcon />
          </Button>
          <Button
            className="p-0.5 rounded size-8 "
            title="Add controlnet layer"
            onClick={handleAddLayer}
          >
            <PlusIcon />
          </Button>
        </div>
      </div>
      <ScrollArea className="pe-2 mb-2" ref={layerItemsListRef}>
        <ul className="max-h-[31vh] pe-2 flex flex-col w-full mt-2 rounded">
          {/* TODO: animate layer on undo/redo to signal which layer was affected */}
          {layers.map(({ id, ...rest }) => (
            <LayerItem
              key={id}
              id={id}
              activeLayerId={activeLayerId}
              isActive={activeLayerId === id}
              {...rest}
            />
          ))}
        </ul>
      </ScrollArea>

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
        {activeControlnetLayer && (
          <ScrollArea className="pe-2 mb-2">
            <div className="flex gap-5 flex-col mt-2 h-[45vh]  pt-1 pr-2.5">
              <div>
                <ImageUploader
                  image={
                    typeof activeControlnetLayer?.image === "string"
                      ? activeControlnetLayer?.image
                      : activeControlnetLayer?.image?.src
                  }
                  onChange={(value) => {
                    handleControlnetSelectChange({
                      name: "image",
                      type: "text",
                      value,
                      layerId: activeControlnetLayer.id,
                    });
                  }}
                  title="Image"
                />
              </div>
              <Checkbox
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

              {/* TODO: show only when IP Adapter nodes are available on Comfy */}
              {backend === "comfy" && (
                <Checkbox
                  checked={activeControlnetLayer?.isIpAdapter}
                  value={activeControlnetLayer?.isIpAdapter}
                  onChange={(value) =>
                    handleControlnetAttrsChange(
                      "isIpAdapter",
                      value,
                      activeControlnetLayer.id
                    )
                  }
                >
                  IP Adapter
                </Checkbox>
              )}

              {backend === "comfy" && activeControlnetLayer?.isIpAdapter ? (
                <>
                  <div className="flex gap-2 h-full flex-col">
                    <Label htmlFor={`model${activeControlnetLayer?.id}`}>
                      IP Adapter Model
                    </Label>
                    <Select
                      name="model"
                      id={`iPAdapterModel${activeControlnetLayer?.id}`}
                      items={ip_adapter_models ?? []}
                      value={activeControlnetLayer?.iPAdapterModel}
                      onChange={(value) =>
                        handleControlnetSelectChange({
                          name: "iPAdapterModel",
                          type: "text",
                          value,
                          layerId: activeControlnetLayer.id,
                        })
                      }
                    />
                  </div>
                  <div className="flex gap-2 flex-col">
                    <Label htmlFor={`weightType${activeControlnetLayer?.id}`}>
                      IP Adpater Weight Type
                    </Label>
                    <Select
                      name="module"
                      items={ip_adapter_weight_types}
                      textAttr="name"
                      valueAttr="name"
                      value={activeControlnetLayer?.iPAdapterWeightType}
                      onChange={(value) =>
                        handleControlnetSelectChange({
                          name: "iPAdapterWeightType",
                          type: "text",
                          value,
                          layerId: activeControlnetLayer.id,
                        })
                      }
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex gap-2 flex-col">
                    <Label htmlFor={`module${activeControlnetLayer?.id}`}>
                      Controlnet Preprocessor
                    </Label>
                    <Select
                      name="module"
                      //FIXME: fix type
                      items={controlnet_preprocessors}
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
                    <Select
                      name="model"
                      id={`model${activeControlnetLayer?.id}`}
                      items={controlnet_models ?? []}
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
                </>
              )}

              {backend === "auto" &&
                !/ip\S*adapter/gi.test(activeControlnetLayer.module) && (
                  <div className="flex gap-2 flex-col">
                    <Label htmlFor={`mode${activeControlnetLayer?.id}`}>
                      Control Mode
                    </Label>

                    <Select
                      name="control_mode"
                      id={`mode${activeControlnetLayer?.id}`}
                      items={CONTROL_MODES}
                      value={activeControlnetLayer?.control_mode}
                      onChange={(value) =>
                        handleControlnetSelectChange({
                          name: "control_mode",
                          type: "object",
                          value,
                          layerId: activeControlnetLayer.id,
                        })
                      }
                    />
                  </div>
                )}

              {backend === "auto" &&
                checkIsIpAdapterControlnetModel(
                  activeControlnetLayer?.model
                ) && (
                  <div className="flex gap-2 flex-col">
                    <Label htmlFor={`mode${activeControlnetLayer?.id}`}>
                      Weight Type
                    </Label>

                    <Select
                      name="weight_type"
                      id={`weight_type${activeControlnetLayer?.id}`}
                      items={WEIGHT_TYPES}
                      value={activeControlnetLayer?.weight_type}
                      onChange={(value) =>
                        handleControlnetSelectChange({
                          name: "weight_type",
                          type: "string",
                          value,
                          layerId: activeControlnetLayer.id,
                        })
                      }
                    />
                  </div>
                )}

              <Slider
                label={
                  backend === "comfy" && activeControlnetLayer.isIpAdapter
                    ? "IP Adapter Weight"
                    : "Controlnet Weight"
                }
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

              {backend === "auto" &&
                (activeControlnetLayer?.weight_type ===
                  "Style and Composition" ||
                  activeControlnetLayer?.weight_type ===
                    "Strong Style and Composition") && (
                  <Slider
                    label="Composition Weight"
                    min={0}
                    max={2}
                    step={0.01}
                    value={activeControlnetLayer?.composition_weight ?? 1}
                    onChange={(value) =>
                      handleControlnetSelectChange({
                        name: "composition_weight",
                        type: "number",
                        value,
                        layerId: activeControlnetLayer.id,
                      })
                    }
                  />
                )}
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
                step={0.01}
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
                step={0.01}
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
              {activeControlnetLayer?.module !== "None" &&
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

              {backend !== "comfy" && activeControlnetLayer?.isIpAdapter && (
                <Checkbox
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
              )}

              {backend === "auto" && (
                <Checkbox
                  checked={activeControlnetLayer?.low_vram}
                  onChange={(value) =>
                    handleControlnetAttrsChange(
                      "low_vram",
                      value,
                      activeControlnetLayer.id
                    )
                  }
                >
                  Low VRAM
                </Checkbox>
              )}

              {backend === "auto" && (
                <Button
                  variant="filled"
                  className="sticky bottom-0 z-2 text-sm shadow-md shadow-black/30"
                  fullWidth
                  onClick={handleControlnetDetect}
                >
                  Detect
                </Button>
              )}
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
    <Button
      variant="clear"
      key="clearMask"
      className="size-[32px] text-base leading-4 p-0 group-data-active:text-black group-data-active:hover:text-neutral-700"
      onClick={(e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onClick(e);
      }}
      title={title}
    >
      {type === "clearLines" ? (
        <EraserIcon />
      ) : type === "clearImage" ? (
        <ViewNoneIcon />
      ) : null}
    </Button>
  );
};
const ColorBox = ({
  color = "white",
  onColorChange,
}: {
  color?: string;
  onColorChange: ColorPickerProps["onColorChange"];
}) => {
  const maskColorBox = useRef<HTMLButtonElement>(null);

  const [isColorPickerVisible, setIsColorPickerVisible] = useState(false);
  const [colorPickerPosition, setColorPickerPosition] = useState<
    ColorPickerProps["position"]
  >({ x: 0, y: 0 });

  const toggleColorPickerVisibility = () => {
    setIsColorPickerVisible((prevState) => !prevState);
  };

  const handleColorBoxClick: MouseEventHandler = (e) => {
    e.stopPropagation();

    if (!isColorPickerVisible) {
      const bbox = maskColorBox.current?.getBoundingClientRect();
      setColorPickerPosition({
        x: (bbox?.right ?? 0) - 255,
        y: bbox?.bottom ?? 0,
      });
    }
    toggleColorPickerVisibility();
  };

  return (
    <>
      <button
        ref={maskColorBox}
        className="size-6 p-0 rounded-full shrink-0 border border-neutral-700 cursor-pointer"
        style={{ backgroundColor: color }}
        onClick={handleColorBoxClick}
        title="Pick Mask Color"
      />
      {isColorPickerVisible && (
        <Portal.Root>
          <ColorPicker
            color={color}
            onClose={toggleColorPickerVisibility}
            onColorChange={onColorChange}
            position={colorPickerPosition}
            isVisible={isColorPickerVisible}
            pickerType="hexOnly"
          />
        </Portal.Root>
      )}
    </>
  );
};
