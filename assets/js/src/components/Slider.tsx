import { ChangeEvent, forwardRef, useId } from "react";
import * as RadixSlider from "@radix-ui/react-slider";
import Input from "./Input";
import Label from "./Label";
import Button from "./Button";
import { ResetIcon } from "@radix-ui/react-icons";
import { twMerge } from "tailwind-merge";

export type SliderProps = {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  defaultValue?: number;
  name?: string;
  showInput?: boolean;
  disabled?: boolean;
  className?: string;
};

const Slider = forwardRef(
  (
    {
      label,
      min,
      max,
      step,
      showInput = true,
      disabled = false,
      name,
      defaultValue,
      value,
      onChange,
      className = "",
    }: SliderProps,
    _ref
  ) => {
    const handleValueChange = (value: number[]) => onChange(value[0]);
    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) =>
      onChange(+e.target.value);

    const handleResetClick = () =>
      defaultValue !== undefined && onChange(defaultValue);

    const inputId = useId();
    return (
      <div className={twMerge("flex flex-col", className)}>
        {showInput && (
          <div className="flex flex-col lg:flex-row gap-2 mb-2 items-start lg:items-center justify-between">
            <Label htmlFor={inputId} className="w-7/12">
              {label}
            </Label>
            <div className="flex gap-1 place-items-center">
              {defaultValue !== undefined && defaultValue !== value && (
                <Button
                  variant="clear"
                  title="Reset"
                  type="button"
                  onClick={handleResetClick}
                  className="h-[12px]"
                  disabled={disabled}
                >
                  <ResetIcon />
                </Button>
              )}
              <Input
                id={inputId}
                className="px-1 min-w-[60px] max-w-[70px] text-xs"
                type="number"
                step={step}
                min={min}
                max={max}
                name={name}
                value={value}
                onChange={handleInputChange}
                disabled={disabled}
              />
            </div>
          </div>
        )}

        <RadixSlider.Root
          className="relative flex items-center select-none touch-none w-full h-5"
          min={min}
          max={max}
          step={step}
          aria-label="Volume"
          value={[value]}
          disabled={disabled}
          onValueChange={handleValueChange}
        >
          {/* TODO: handle values greater than max, the slider extends beyond the available width */}
          <RadixSlider.Track className="relative grow rounded-full h-[3px] bg-neutral-900">
            <RadixSlider.Range
              className={`absolute ${disabled ? "bg-neutral-600" : "bg-primary"} rounded-full h-full`}
            />
          </RadixSlider.Track>
          <RadixSlider.Thumb
            className={`block w-4 h-4 ${disabled ? "bg-neutral-700 border-none" : "bg-white"} shadow-[0_2px_10px] shadow-black rounded-[10px] border-2 focus:border-primary focus:scale-120 outline-hidden transition-all duration-100 ease-in-out`}
          />
        </RadixSlider.Root>
      </div>
    );
  }
);

Slider.displayName = "Slider";

export default Slider;
