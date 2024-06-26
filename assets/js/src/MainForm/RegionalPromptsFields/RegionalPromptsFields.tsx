import { MouseEventHandler, useEffect, useRef, useState } from "react";
import { Control, Controller, useWatch } from "react-hook-form";
import Editor from "../../components/Editor";
import Label from "../../components/Label";
import ColorPicker, { ColorPickerProps } from "../../ColorPicker";
import { useAppDispatch, useAppSelector } from "../../hooks";
import {
  PromptRegionLayer,
  addPromptRegionLayer,
  decrementOrder,
  incrementOrder,
  removePromptRegionLayer,
  selectIsRegionalPromptsEnabled,
  selectPromptRegionLayers,
  setIsRegionalPromptEnabled,
  setPreviewLayerId,
  updatePromptRegionLayer,
} from "../../state/promptRegionsSlice";

import { v4 as uuid4 } from "uuid";
import Slider from "../../components/Slider";
import ExpandCollapseCheckbox from "../../components/ExpandCollapseCheckbox";
import { selectActiveLayer, setActiveLayer } from "../../state/layersSlice";
import { ArrowDownIcon, ArrowUpIcon, TrashIcon } from "@radix-ui/react-icons";
import { useFormContext } from "react-hook-form";
import Checkbox from "../../components/Checkbox";
import * as Portal from "@radix-ui/react-portal";
import Button from "../../components/Button";

type PromptRegionProps = PromptRegionLayer & {
  index: number;
  canRemove: boolean;
  regionsCount: number;
  control: Control;
};

const RegionalPromptsFields = () => {
  const dispatch = useAppDispatch();

  const { control, unregister, setValue } = useFormContext();

  const regions = useAppSelector(selectPromptRegionLayers);

  const regionalPrompts = useWatch({
    control,
    name: "regionalPrompts",
    defaultValue: {},
  });

  // sync form with region mask layer add/remove
  useEffect(() => {
    if (regions.length !== Object.keys(regionalPrompts).length) {
      Object.keys(regionalPrompts)?.forEach((id) => {
        regions.findIndex((region) => region.id === id) === -1 &&
          unregister(`regionalPrompts.${id}`);
      });
      // console.log({ updatedValue });
    }
  }, [regionalPrompts, regions, unregister]);
  const handleAddRegionPrompt: MouseEventHandler = (event) => {
    event.preventDefault();
    dispatch(addPromptRegionLayer(uuid4()));
  };

  const regionsCount = regions.length;

  return (
    <div className="flex flex-col gap-4">
      <Controller
        name="isRegionalPromptingEnabled"
        control={control}
        defaultValue={false}
        rules={{
          onChange: (event) => {
            const value = event.target.value;
            value && setValue("isMultidiffusionEnabled", false);
            value && setValue("isUltimateUpscaleEnabled", false);
            dispatch(setIsRegionalPromptEnabled(value));
          },
        }}
        render={({ field }) => (
          <ExpandCollapseCheckbox label="Regional Prompts" {...field}>
            <>
              <div className="p-2 py-5 flex flex-col gap-5 bg-neutral-100/5 rounded-md">
                <Controller
                  name="globalPromptWeight"
                  control={control}
                  render={({ field }) => (
                    <Slider
                      label="Global Prompt Weight"
                      min={0.1}
                      max={1}
                      step={0.1}
                      {...field}
                    />
                  )}
                  defaultValue={0.3}
                />
                {regions?.map((regionProps, index) => (
                  <PromptRegion
                    key={regionProps.id}
                    control={control}
                    index={index}
                    {...regionProps}
                    canRemove={regions.length > 2}
                    regionsCount={regionsCount}
                  />
                ))}
                <Button fullWidth onClick={handleAddRegionPrompt}>
                  Add
                </Button>
              </div>
            </>
          </ExpandCollapseCheckbox>
        )}
      />
      {/* {isRegionalPromptingEnabled && (
        <>
          <div className="p-2 py-5 flex flex-col gap-5 bg-neutral-100/5 rounded-md">
            <Controller
              name="globalPromptWeight"
              control={control}
              render={({ field }) => (
                <Slider
                  label="Global Prompt Weight"
                  min={0}
                  max={1}
                  step={0.1}
                  {...field}
                />
              )}
              defaultValue={0.3}
            />
            {regions?.map((regionProps, index) => (
              <PromptRegion
                key={regionProps.id}
                control={control}
                index={index}
                {...regionProps}
              />
            ))}
            <button onClick={handleAddRegionPrompt}>Add</button>
          </div>
        </>
      )} */}
    </div>
  );
};

const PromptRegion = ({
  id,
  control,
  name,
  maskColor,
  isEnabled,
  canRemove,
  prompt,
  index,
  regionsCount,
}: PromptRegionProps) => {
  const dispatch = useAppDispatch();

  const [isColorPickerVisible, setIsColorPickerVisible] = useState(false);

  const isRegionalPromptEnabled = useAppSelector(
    selectIsRegionalPromptsEnabled
  );

  const colorButtonRef = useRef<HTMLButtonElement>(null);
  const handleColorButtonClick: MouseEventHandler = (event) => {
    event.preventDefault();
    setIsColorPickerVisible((prevState) => !prevState);
  };
  const handleColorPickerClose = () => {
    setIsColorPickerVisible(false);
  };
  const handleColorChange: ColorPickerProps["onColorChange"] = (color) => {
    color &&
      dispatch(
        updatePromptRegionLayer({
          layerId: id,
          maskColor: color,
        })
      );
  };

  const activeLayer = useAppSelector(selectActiveLayer);
  const isActive = activeLayer === `regionMask${id}`;

  const handleMoveUpClick: MouseEventHandler = (event) => {
    event.preventDefault();
    dispatch(decrementOrder(id ?? ""));
  };

  const handleMoveDownClick: MouseEventHandler = (event) => {
    event.preventDefault();
    dispatch(incrementOrder(id ?? ""));
  };

  const handleRemovePrompt: MouseEventHandler = (event) => {
    event.stopPropagation();
    dispatch(removePromptRegionLayer(id ?? ""));
    dispatch(setActiveLayer("base"));
  };

  const handleIsEnabledCheckedChange = (isEnabled) => {
    dispatch(updatePromptRegionLayer({ layerId: id, isEnabled }));
  };

  return (
    <div
      className="p-1 relative"
      onMouseEnter={(event) => {
        dispatch(setPreviewLayerId(id));
      }}
      onMouseLeave={(event) => {
        dispatch(setPreviewLayerId());
      }}
    >
      <fieldset
        className="flex justify-between w-full cursor-pointer gap-4 sm:flex-col lg:flex-row"
        onClick={() => {
          isRegionalPromptEnabled &&
            dispatch(setActiveLayer(`regionMask${id ?? ""}`));
        }}
      >
        <div className="flex gap-3 place-items-center sm:flex-col 2xl:flex-row sm:items-start">
          <Label
            className={`pe-3 transition-colors cursor-pointer ${isEnabled ? (isActive ? "text-primary" : "text-inherit") : "text-neutral-600"}`}
          >
            {name || `Region ${index + 1}`}
          </Label>
          <div className="flex gap-3">
            <Button
              variant="clear"
              className="p-1"
              onClick={handleMoveDownClick}
              title="Move Down"
              disabled={index === regionsCount - 1}
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
            <Button
              variant="clear"
              className="p-1"
              onClick={handleRemovePrompt}
              disabled={!canRemove}
              title="Remove Prompt"
            >
              <TrashIcon />
            </Button>
          </div>
        </div>
        <div className="flex gap-3 place-items-start">
          <button
            className="p-0 border border-neutral-500 rounded-full shrink-0 size-6"
            style={{ backgroundColor: maskColor ?? "white" }}
            onClick={handleColorButtonClick}
            ref={colorButtonRef}
            title="Pick Mask Color"
          />
          <Checkbox
            disabled={!isRegionalPromptEnabled}
            title={
              isRegionalPromptEnabled ? "Use" : "Regional Prompts Disabled"
            }
            value={isEnabled}
            onCheckedChange={handleIsEnabledCheckedChange}
          />
        </div>
        {/* FIXME: move the inital position if there isn't enough room in viewport*/}
        {isColorPickerVisible && (
          <Portal.Root>
            <ColorPicker
              isVisible={isColorPickerVisible}
              onClose={handleColorPickerClose}
              onColorChange={handleColorChange}
              position={{
                x: colorButtonRef.current?.getBoundingClientRect().left ?? 0,
                y: colorButtonRef.current?.getBoundingClientRect().bottom ?? 0,
              }}
              pickerType="hexOnly"
            />
          </Portal.Root>
        )}
      </fieldset>
      {/* TODO: select corresponding region mask layer when prompt box is active */}
      <Controller
        name={`regionalPrompts.${id}.prompt`}
        control={control}
        render={({ field }) => <Editor placeholder="Prompt" {...field} />}
      />
      <div className="my-3">
        <Controller
          name={`regionalPrompts.${id}.weight`}
          control={control}
          render={({ field }) => (
            <Slider
              label="Prompt Weight"
              min={0.1}
              max={1}
              step={0.01}
              {...field}
            />
          )}
          defaultValue={1}
        />
      </div>
    </div>
  );
};

export default RegionalPromptsFields;
