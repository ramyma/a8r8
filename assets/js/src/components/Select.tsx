import React, { SelectHTMLAttributes, forwardRef, useEffect } from "react";
import * as RadixSelect from "@radix-ui/react-select";
import { ChevronDownIcon, ChevronUpIcon } from "@radix-ui/react-icons";

interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
  items: (string | { value: any; label: string })[];
  /**
   * @defaultValue 'value'
   */
  idAttr?: string;
  /**
   * @defaultValue 'value'
   */
  valueAttr?: string;
  /**
   * @defaultValue 'label'
   */
  textAttr?: string;
  placeholder?: string;
  value?: string | number;
  onChange: (value: string) => void;
}

const Select = forwardRef(
  (
    {
      items,
      disabled,
      valueAttr = "value",
      textAttr = "label",
      idAttr = valueAttr,
      value,
      placeholder = "",
      onChange,
      title,
      ...rest
    }: SelectProps,
    _ref
  ) => {
    useEffect(() => {
      if (!value && items?.length) {
        const item = items[0];

        if (typeof item === "object") {
          onChange && onChange(item[valueAttr]);
        } else {
          onChange && onChange(item);
        }
      }
    }, [items, onChange, rest?.name, value, valueAttr]);

    const selectedItem = items?.find(
      (item) => (typeof item === "object" ? item[valueAttr] : item) === value
    );

    return (
      <RadixSelect.Root
        value={"" + value}
        onValueChange={(newValue) => onChange && onChange("" + newValue)}
        disabled={disabled}
      >
        <RadixSelect.Trigger
          className={
            "inline-flex items-center justify-between rounded px-2 text-sm leading-none h-[35px] gap-[5px]  text-violet11 shadow-[0_2px_10px] shadow-black/10 focus:shadow-[0_0_0_2px] focus:shadow-black data-[placeholder]:text-violet9 outline-none w-full text-neutral-200 bg-neutral-800/80 hover:bg-neutral-800 border-neutral-700 disabled:text-neutral-700 overflow-hidden " +
              rest.className ?? ""
          }
          title={title}
        >
          <RadixSelect.Value placeholder={placeholder} asChild>
            <span
              title={
                typeof selectedItem === "object"
                  ? selectedItem[textAttr]
                  : value
              }
              className="block text-start truncate disabled:text-neutral-700"
              aria-label={
                typeof selectedItem === "object"
                  ? selectedItem[valueAttr]
                  : value
              }
            >
              {selectedItem &&
                (typeof selectedItem === "object"
                  ? selectedItem[textAttr]
                  : value)}
            </span>
          </RadixSelect.Value>
          <RadixSelect.Icon className="text-neutral-700 data-[highlighted]:text-neutral-100" />
        </RadixSelect.Trigger>

        <RadixSelect.Portal className="z-10 border-neutral-700 border">
          <RadixSelect.Content
            className="overflow-auto bg-neutral-900/95 backdrop-blur-sm rounded shadow-md shadow-black text-sm "
            position="item-aligned"
          >
            <RadixSelect.ScrollUpButton className="flex items-center justify-center h-[25px] bg-neutral-900/70 text-white cursor-default">
              <ChevronUpIcon />
            </RadixSelect.ScrollUpButton>
            <RadixSelect.Viewport>
              {items?.map((item, index) => (
                <RadixSelect.Item
                  key={
                    (rest?.name ?? "") +
                    (typeof item === "object" ? item[idAttr] : item) +
                    index
                  }
                  value={typeof item === "object" ? item[valueAttr] : item}
                  className="p-1 px-2 data-[highlighted]:bg-neutral-200 data-[highlighted]:text-neutral-900 data-[state=checked]:text-primary select-none"
                >
                  <RadixSelect.ItemText>
                    {typeof item === "object" ? item[textAttr] : item}
                  </RadixSelect.ItemText>
                  <RadixSelect.ItemIndicator />
                </RadixSelect.Item>
              ))}
              {/* <RadixSelect.Group>
            <RadixSelect.Label />
            <RadixSelect.Item>
              <RadixSelect.ItemText />
              <RadixSelect.ItemIndicator />
            </RadixSelect.Item>
          </RadixSelect.Group> */}

              <RadixSelect.Separator />
            </RadixSelect.Viewport>
            <RadixSelect.ScrollDownButton className="flex items-center justify-center h-[25px] bg-neutral-900/70 text-white cursor-default">
              <ChevronDownIcon />
            </RadixSelect.ScrollDownButton>
            <RadixSelect.Arrow />
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
    );
  }
);

Select.displayName = "Select";
export default Select;
