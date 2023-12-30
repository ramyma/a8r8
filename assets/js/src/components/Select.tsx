import React, {
  ChangeEventHandler,
  KeyboardEventHandler,
  MouseEventHandler,
  SelectHTMLAttributes,
  forwardRef,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as RadixSelect from "@radix-ui/react-select";
import * as Portal from "@radix-ui/react-portal";
import { CrossCircledIcon } from "@radix-ui/react-icons";
import uFuzzy from "@leeoniya/ufuzzy";
import Input from "./Input";
import ScrollArea from "./ScrollArea";

const uFuzzyObj = new uFuzzy({
  intraMode: 1,
  intraIns: 1,
  intraChars: ".",
  interChars: ".",
  intraSub: 1,
  intraTrn: 1,
  intraDel: 1,
});
interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "value"> {
  items: Required<SelectProps>["value"][];
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
  value?: string | number | { value: string | number; label: string };
  onChange: (value: SelectProps["value"]) => void;
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
    const triggerRef = useRef<HTMLButtonElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const selectContentRef = useRef<HTMLDivElement>(null);
    const selectedItemRef = useRef<HTMLLIElement>(null);
    const activeItemRef = useRef<HTMLLIElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const modalBodyRef = useRef<HTMLDivElement>(null);

    const [isOpen, setIsOpen] = useState(false);
    const [prevIsOpen, setPrevIsOpen] = useState<boolean>();
    const [search, setSearch] = useState("");
    const [activeItem, setActiveItem] = useState(0);

    const filteredItems = useMemo(() => {
      if (!search) {
        setActiveItem(0);
        return items;
      }
      const haystack = items?.map((item) =>
        typeof item === "string" ? item : item?.[textAttr]
      );
      if (haystack?.length > 0) {
        const idxs = uFuzzyObj.filter(haystack, search);

        const filtered = items?.filter((_, index) => idxs?.includes(index));
        setActiveItem(0);
        return filtered;
      }
      return items;
    }, [items, search, textAttr]);

    const selectedItemIdx: number = filteredItems?.findIndex(
      (item) => (typeof item === "object" ? item[valueAttr] : item) === value
    );

    if (prevIsOpen !== isOpen) {
      const selectedBBox = activeItemRef.current?.getBoundingClientRect();
      const scrollContainerBBox =
        scrollContainerRef.current?.getBoundingClientRect();
      if (selectedBBox && scrollContainerBBox) {
        if (selectedBBox.top > scrollContainerBBox.bottom) {
          scrollContainerRef.current?.scrollBy(
            0,
            selectedBBox.bottom - scrollContainerBBox.bottom
          );
        }
      }
      setPrevIsOpen(isOpen);
      setActiveItem(selectedItemIdx);
    }

    const [pos, setPos] = useState({ x: 0, y: 0, yDir: "bottom" });

    useEffect(() => {
      if (!value && items?.length) {
        const item = items[0];

        if (typeof item === "object") {
          onChange && onChange(item[valueAttr]);
        } else {
          onChange && onChange(item);
        }
      }
    }, [items, onChange, value, valueAttr]);

    useLayoutEffect(() => {
      const bodyBoundingBox = document.body.getBoundingClientRect();
      const selectContentBoundingBox =
        selectContentRef.current?.getBoundingClientRect();
      const triggerBoundingBox = triggerRef.current?.getBoundingClientRect();
      if (bodyBoundingBox && selectContentBoundingBox && triggerBoundingBox) {
        const x = triggerBoundingBox?.left ?? 0;
        const y =
          selectContentBoundingBox.height + triggerBoundingBox.top >
          bodyBoundingBox.height
            ? window.document.body.getBoundingClientRect().height -
              triggerBoundingBox.top
            : triggerBoundingBox.top;

        setPos((pos) => {
          return {
            ...pos,
            x,
            y,
            yDir:
              selectContentBoundingBox?.height + triggerBoundingBox?.top >
              bodyBoundingBox.height
                ? "bottom"
                : "top",
          };
        });
      }
    }, [isOpen, filteredItems]);

    useEffect(() => {
      isOpen && searchInputRef.current?.focus();
    }, [isOpen]);

    useEffect(() => {
      const itemRef =
        selectedItemIdx === activeItem
          ? activeItemRef.current
          : selectedItemRef.current;
      if (itemRef) {
        const bbox = itemRef.getBoundingClientRect();
        const scrollContainerBbox =
          scrollContainerRef.current?.getBoundingClientRect();
        if (bbox && scrollContainerBbox) {
          if (bbox.bottom > scrollContainerBbox.bottom) {
            scrollContainerRef.current?.scrollBy(
              0,
              bbox.bottom - scrollContainerBbox.bottom
            );
          } else if (bbox.bottom <= scrollContainerBbox.top) {
            scrollContainerRef.current?.scrollBy(
              0,
              bbox.top - scrollContainerBbox.top
            );
          }
        }
      }
    }, [activeItem, selectedItemIdx]);

    const selectedItem = items?.find(
      (item) => (typeof item === "object" ? item[valueAttr] : item) === value
    );

    const handleOpen = (open: boolean) => {
      setIsOpen(open);
    };

    const toggleOpen = () => {
      if (isOpen) {
        triggerRef.current?.focus();
        setSearch("");
      }
      setIsOpen((isOpen) => !isOpen);
    };

    const handleSearchChange: ChangeEventHandler<HTMLInputElement> = (e) => {
      const value = e.target.value;
      setSearch(value);
    };

    const decrementSelectedItemIdx = () => {
      setActiveItem((activeItem) =>
        activeItem - 1 < 0 ? filteredItems.length - 1 : activeItem - 1
      );
    };

    const incrementSelectedItemIdx = () => {
      setActiveItem((activeItem) =>
        activeItem + 1 > filteredItems.length - 1 ? 0 : activeItem + 1
      );
    };

    const handleSearchKeydown: KeyboardEventHandler = (e) => {
      if (!isOpen) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          incrementSelectedItemIdx();
          break;
        case "ArrowUp":
          e.preventDefault();
          decrementSelectedItemIdx();
          break;
        case "Escape":
          e.stopPropagation();
          toggleOpen();
          break;
        case "Enter": {
          if (e.ctrlKey) return;
          e.preventDefault();
          setValue();
          break;
        }
        case "Tab":
          e.preventDefault();
          break;
        default:
          break;
      }
    };

    const handleTriggerKeyDown: KeyboardEventHandler = (e) => {
      if (!isOpen) {
        switch (e.key) {
          case "Space":
          case "Enter":
          case "ArrowDown":
          case "ArrowUp":
            if (e.ctrlKey || e.shiftKey || e.altKey) break;
            toggleOpen();
            break;
          default:
            break;
        }

        if (!e.ctrlKey && e.key.length === 1 && e.key.match(/[\S\s]/i)) {
          toggleOpen();
        }
      }
    };

    const handleClearSearchClick: MouseEventHandler = () => {
      setSearch("");
    };

    const setValue = (index?: string) => {
      const selectedItem =
        filteredItems[index ?? activeItem ?? selectedItemIdx];
      selectedItem &&
        onChange(
          typeof selectedItem === "object"
            ? selectedItem[valueAttr]
            : selectedItem
        );
      isOpen && toggleOpen();
    };

    const handleClickOutside: MouseEventHandler = () => {
      toggleOpen();
    };

    return (
      <RadixSelect.Root
        value={"" + value}
        // onValueChange={(newValue) => onChange && onChange("" + newValue)}
        disabled={disabled}
        onOpenChange={handleOpen}
      >
        <RadixSelect.Trigger
          ref={triggerRef}
          className={
            "inline-flex items-center justify-between rounded px-2 text-sm leading-none h-[35px] gap-[5px]  text-violet11 shadow-[0_2px_10px] shadow-black/10 focus:shadow-[0_0_0_2px] focus:shadow-black data-[placeholder]:text-violet9 outline-none w-full text-neutral-200 bg-neutral-800/80 hover:bg-neutral-800 border-neutral-700 disabled:text-neutral-700 overflow-hidden " +
              rest.className ?? ""
          }
          title={title}
          onClick={toggleOpen}
          onKeyDown={handleTriggerKeyDown}
        >
          <RadixSelect.Value placeholder={placeholder} asChild>
            <span className="block text-start truncate disabled:text-neutral-700">
              {selectedItem &&
                (typeof selectedItem === "object"
                  ? selectedItem[textAttr]
                  : value)}
            </span>
          </RadixSelect.Value>
          <RadixSelect.Icon className="text-neutral-700 data-[highlighted]:text-neutral-100 ml-auto" />
        </RadixSelect.Trigger>

        <Portal.Root asChild>
          <div
            className={
              "absolute top-0 left-0 w-screen h-screen z-50 overflow-hidden transition-all duration-200 ease-in-out " +
              (!isOpen ? "pointer-events-none opacity-0" : "opacity-100")
            }
          >
            <div
              className="absolute top-0 left-0 w-full h-full z-10 bg-black/0"
              onClick={handleClickOutside}
              ref={modalBodyRef}
            />
            <div
              className="absolute shadow-md shadow-black/50 mx-auto max-w-md z-50 border-neutral-700 bg-neutral-900/0 border-[1px] rounded-md border-solid text-sm select-none backdrop-blur-sm"
              style={{ [pos.yDir]: pos.y, left: pos.x }}
              onMouseUp={(e) => {
                if (e.target !== searchInputRef.current)
                  searchInputRef.current?.focus();
              }}
              ref={selectContentRef}
            >
              <div className="relative flex align-middle">
                <Input
                  className="p-3 pe-10 hover:bg-neutral-800/80 w-full rounded-t-md transition-all"
                  placeholder="Search"
                  autoFocus
                  value={search}
                  onChange={handleSearchChange}
                  onKeyDown={handleSearchKeydown}
                  ref={searchInputRef}
                />

                <CrossCircledIcon
                  data-testid="clearSearch"
                  height="24"
                  width="24"
                  className={
                    "absolute end-2 m-0 top-[11px] text-neutral-400 hover:text-neutral-300 transition-all duration-500 cursor-pointer will-change-[filter,opacity] " +
                    (search ? "opacity-100" : "opacity-0 pointer-events-none")
                  }
                  onClick={handleClearSearchClick}
                />
              </div>
              <ScrollArea type="auto" ref={scrollContainerRef}>
                <div className="max-h-72  " ref={scrollContainerRef}>
                  <ul className="relative flex flex-col overflow-x-hidden bg-neutral-900/90">
                    {filteredItems?.map((item, index) => (
                      <li
                        // role="listitem"
                        ref={
                          selectedItemIdx === index
                            ? activeItemRef
                            : index === activeItem
                            ? selectedItemRef
                            : undefined
                        }
                        key={
                          (rest?.name ?? "") +
                          (typeof item === "object" ? item[idAttr] : item) +
                          index
                        }
                        className={
                          "p-2 first:rounded-t-none last:rounded-b-md transition-colors duration-100 truncate " +
                          (index === selectedItemIdx && activeItem === index
                            ? "bg-neutral-100"
                            : index === selectedItemIdx
                            ? "bg-neutral-800/50"
                            : activeItem === index
                            ? "bg-neutral-100 text-neutral-900"
                            : "hover:bg-neutral-900/70") +
                          (selectedItemIdx === index ? " text-primary" : "")
                        }
                        title={typeof item === "object" ? item[textAttr] : item}
                        onClick={() => setValue("" + index)}
                        onMouseUp={() => setValue("" + index)}
                        onMouseEnter={() => setActiveItem(index)}
                      >
                        {typeof item === "object" ? item[textAttr] : item}
                      </li>
                    ))}
                  </ul>
                </div>
              </ScrollArea>
            </div>
          </div>
        </Portal.Root>
      </RadixSelect.Root>
    );
  }
);

Select.displayName = "Select";
export default Select;
