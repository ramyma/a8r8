import { ChangeEvent, forwardRef, useId } from "react";
import * as RadixSlider from "@radix-ui/react-slider";
import Input from "./Input";
import Label from "./Label";

type Props = {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  showInput?: boolean;
};

const Slider = forwardRef(
  (
    { label, min, max, step, showInput = true, value, onChange }: Props,
    _ref
  ) => {
    const handleValueChange = (value: number[]) => onChange(value[0]);
    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) =>
      onChange(+e.target.value);

    const inputId = useId();
    return (
      <div className="flex flex-col">
        {showInput && (
          <div className="flex flex-col lg:flex-row gap-2 mb-2 items-start lg:items-center  justify-between">
            <Label htmlFor={inputId} className="w-7/12">
              {label}
            </Label>
            <Input
              id={inputId}
              className="px-1 min-w-[60px] max-w-[70px]"
              type="number"
              step={step}
              min={min}
              max={max}
              value={value}
              onChange={handleInputChange}
            />
          </div>
        )}

        <RadixSlider.Root
          className="relative flex items-center select-none touch-none w-full h-5"
          min={min}
          max={max}
          step={step}
          aria-label="Volume"
          value={[value]}
          onValueChange={handleValueChange}
        >
          {/* TODO: handle values greater than max, the slider extends beyond the available width */}
          <RadixSlider.Track className="relative grow rounded-full h-[3px] bg-neutral-900">
            <RadixSlider.Range className="absolute bg-primary rounded-full h-full" />
          </RadixSlider.Track>
          <RadixSlider.Thumb className="block w-4 h-4 bg-white shadow-[0_2px_10px] shadow-black rounded-[10px] border-2 focus:border-primary focus:scale-120 outline-none transition-all duration-100 ease-in-out" />
        </RadixSlider.Root>
      </div>
    );
  }
);

Slider.displayName = "Slider";

export default Slider;
