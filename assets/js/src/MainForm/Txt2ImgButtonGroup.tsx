import React, { forwardRef } from "react";
import * as RadixToggleGroup from "@radix-ui/react-toggle-group";
import { ImageIcon, TextAlignJustifyIcon } from "@radix-ui/react-icons";

interface Txt2ImageButtonGroupProps {
  value: boolean;
  onChange: (value: boolean) => void;
}
const Txt2ImageButtonGroup = forwardRef(
  ({ value, onChange }: Txt2ImageButtonGroupProps, _ref) => {
    const handleChange = (newValue) => {
      newValue && onChange(newValue === "txt2img");
    };

    const toggleGroupItemClasses =
      "data-[state=on]:bg-neutral-800/90 data-[state=on]:border-primary flex h-[35px] w-[35px] items-center justify-center bg-neutral-900/80 hover:bg-neutral-700/80 hover:border-neutral-500 text-base leading-4 first:rounded-l last:rounded-r focus:z-10 focus:shadow-black focus:outline-none text-white text-sm flex-1 transition-colors duration-300 ease-in-out border-neutral-700 border";
    return (
      <RadixToggleGroup.Root
        className="inline-flex rounded shadow-black/30 justify-between "
        type="single"
        defaultValue="center"
        aria-label="Text alignment"
        value={value ? "txt2img" : "img2img"}
        onValueChange={handleChange}
      >
        <RadixToggleGroup.Item
          className={
            toggleGroupItemClasses + " rounded-tr-none rounded-br-none"
          }
          value="txt2img"
          aria-label="Left aligned"
          title="Text to Image"
        >
          <div className="inline-flex gap-2">
            <TextAlignJustifyIcon />
            <span>T2I</span>
          </div>
        </RadixToggleGroup.Item>
        {/* <RadixToggleGroup.Item
      className={toggleGroupItemClasses}
      value="center"
      aria-label="Center aligned"
    >
      <TextAlignCenterIcon />
    </RadixToggleGroup.Item> */}
        <RadixToggleGroup.Item
          className={
            toggleGroupItemClasses + " rounded-tl-none rounded-bl-none"
          }
          value="img2img"
          aria-label="Right aligned"
          title="Image to Image"
        >
          <div className="inline-flex gap-2">
            <ImageIcon />
            <span>I2I</span>
          </div>
        </RadixToggleGroup.Item>
      </RadixToggleGroup.Root>
    );
  }
);

Txt2ImageButtonGroup.displayName = "Txt2ImageButtonGroup";

export default Txt2ImageButtonGroup;
