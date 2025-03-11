import {
  ChangeEventHandler,
  KeyboardEventHandler,
  MouseEvent,
  MouseEventHandler,
  SelectHTMLAttributes,
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Select as RadixSelect } from "radix-ui";

import * as Portal from "@radix-ui/react-portal";
import { CheckIcon, CrossCircledIcon } from "@radix-ui/react-icons";
import Input from "./Input";
import ScrollArea from "./ScrollArea";
import useFuzzySearch from "../hooks/useFuzzySearch";
import { twMerge } from "tailwind-merge";
import Chip from "./Chip";
import { isArray } from "remirror";
import { AnimatePresence, motion } from "motion/react";

const UNGROUPED_NAME = "Other";

type Group = Record<string, GroupItem[]>;

type GroupItem = {
  item: unknown;
  index: number;
  groupItemIndex: number;
};

const getItemLabel = ({ item, textAttr }) => {
  if (typeof item === "object") {
    return item[textAttr];
  } else {
    return item;
  }
};

const getItemValue = ({ item, valueAttr }) => {
  if (typeof item === "object") {
    return item[valueAttr];
  }
  return item;
};

const getSelectedItemIndex = ({
  value,
  itemsByGroup = {},
  valueAttr,
}: {
  value: unknown;
  itemsByGroup: Group;
  valueAttr: string;
}): number => {
  const groups = Object.values(itemsByGroup);
  let countIdx = 0;
  for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
    const items = groups[groupIndex];
    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      const groupItem = items[itemIndex];
      if (getItemValue({ item: groupItem.item, valueAttr }) === value) {
        return countIdx;
      }
      countIdx += 1;
    }
  }
  return -1;
};

export interface SelectProps<
  T = string | number | { value: string | number; label: string },
> extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "value"> {
  items: Readonly<T[]>;
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
  value?: T | T[];
  onChange: (value: SelectProps["value"]) => void;
  shouldSetDefaultValue?: boolean;
  groups?: {
    name: string;
    matcher: (name: string) => boolean;
  }[];
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
      shouldSetDefaultValue = true,
      groups,
      multiple,
      ...rest
    }: SelectProps,
    _ref
  ) => {
    const triggerRef = useRef<HTMLButtonElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const selectedItemRef = useRef<HTMLLIElement>();
    const activeItemRef = useRef<HTMLLIElement>();
    const scrollContainerRef = useRef<HTMLDivElement>();
    const modalBodyRef = useRef<HTMLDivElement>(null);

    const [isOpen, setIsOpen] = useState(false);
    const [prevIsOpen, setPrevIsOpen] = useState<boolean>();
    const [search, setSearch] = useState("");
    const [activeItem, setActiveItem] = useState(0);

    const initializedGroups = useMemo(
      () => [...(groups ?? []), { name: UNGROUPED_NAME, matcher: () => true }],
      [groups]
    );

    //TODO:add loading state

    const { searchItems } = useFuzzySearch(items ?? [], {
      filter: search,
      options: { keys: [textAttr] },
    });

    const getItemsByGroups: (
      items: SelectProps["items"],
      groups: SelectProps["groups"]
    ) => Group = useCallback(
      (items, groups = []) => {
        const itemsByGroups = items?.reduce((acc, item) => {
          for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
            const group = groups?.[groupIndex];

            if (
              group.name !== UNGROUPED_NAME &&
              group?.matcher(getItemLabel({ item, textAttr }))
            ) {
              const groupItems: unknown[] = acc[group.name] ?? [];
              return {
                ...acc,
                [group["name"]]: [...groupItems, item],
              };
            } else if (group.name === UNGROUPED_NAME) {
              const groupItems: unknown[] = acc[UNGROUPED_NAME] ?? [];
              return {
                ...acc,
                [UNGROUPED_NAME]: [...groupItems, item],
              };
            }
          }
          return acc;
        }, {});
        let itemsIdx = 0;
        const entries = Object.entries(itemsByGroups);

        const sorted = search
          ? entries
          : entries.toSorted(([groupNameA], [groupNameB]) =>
              groupNameA === UNGROUPED_NAME
                ? 1
                : groupNameB === UNGROUPED_NAME
                  ? -1
                  : groupNameA <= groupNameB
                    ? -1
                    : 1
            );
        return sorted.reduce((acc, [groupName, items]) => {
          return {
            ...acc,
            [groupName]: (items as unknown[]).map((item, groupItemIndex) => ({
              item,
              index: itemsIdx++,
              groupItemIndex,
            })),
          };
        }, {});
      },
      [textAttr]
    );

    const [filteredItems, groupedFilteredItems = {}] = useMemo(() => {
      if (!search) {
        if (!items) {
          return [undefined, undefined];
        }
        return [items, getItemsByGroups(items, initializedGroups)];
      }

      const resultItems = searchItems(search);
      const groupedResultItems = getItemsByGroups(
        resultItems,
        initializedGroups
      );
      return [resultItems, groupedResultItems];
    }, [getItemsByGroups, initializedGroups, items, search, searchItems]);

    const selectedItemIdx = !multiple
      ? getSelectedItemIndex({
          value,
          itemsByGroup: groupedFilteredItems,
          valueAttr,
        })
      : -1;

    useLayoutEffect(() => {
      if (prevIsOpen !== isOpen) {
        if (isOpen) searchInputRef.current?.focus();

        const selectedBBox = activeItemRef.current?.getBoundingClientRect();
        const scrollContainerBBox =
          scrollContainerRef.current?.getBoundingClientRect();
        if (isOpen && selectedBBox && scrollContainerBBox) {
          if (selectedBBox.top > scrollContainerBBox.bottom) {
            scrollContainerRef.current?.scrollBy(
              0,
              selectedBBox.bottom - scrollContainerBBox.bottom
            );
          }
        }

        if (isOpen) setActiveItem(selectedItemIdx);
        setPrevIsOpen(isOpen);
      }
    }, [isOpen, prevIsOpen, selectedItemIdx]);

    const [pos, setPos] = useState({ x: 0, y: 0 });

    useEffect(() => {
      if (shouldSetDefaultValue && !multiple && !value && items?.length) {
        const item = items[0];

        if (typeof item === "object") {
          if (onChange) onChange(item[valueAttr]);
        } else {
          if (onChange) onChange(item);
        }
      }
    }, [items, multiple, onChange, shouldSetDefaultValue, value, valueAttr]);

    const scrollToItemRef = useCallback(
      (itemRef?: HTMLElement | null) => {
        if (isOpen && itemRef) {
          const offset = (initializedGroups?.length ?? 0) > 1 ? 32 : 0;
          const bbox = itemRef.getBoundingClientRect();
          const scrollContainerBbox =
            scrollContainerRef.current?.getBoundingClientRect();
          if (bbox && scrollContainerBbox) {
            if (bbox.bottom > scrollContainerBbox.bottom) {
              scrollContainerRef.current?.scrollBy(
                0,
                bbox.bottom - scrollContainerBbox.bottom
              );
            } else if (bbox.bottom - offset <= scrollContainerBbox.top) {
              scrollContainerRef.current?.scrollBy(
                0,
                bbox.top - scrollContainerBbox.top - offset
              );
            }
          }
        }
      },
      [initializedGroups?.length, isOpen]
    );
    const scrollContainerRefCallback = useCallback(
      (scrollContainerNode) => {
        scrollContainerRef.current = scrollContainerNode;
        scrollToItemRef(activeItemRef.current || selectedItemRef.current);
      },
      [scrollToItemRef]
    );

    const selectContentRef = useCallback(
      (selectContentNode) => {
        if (selectContentNode) {
          const bodyBoundingBox = document.body.getBoundingClientRect();

          const triggerBoundingBox =
            triggerRef.current?.getBoundingClientRect();

          const selectContentBoundingBox =
            selectContentNode?.getBoundingClientRect();

          if (
            bodyBoundingBox &&
            triggerBoundingBox &&
            selectContentBoundingBox
          ) {
            const x =
              selectContentBoundingBox.width + triggerBoundingBox.left >
              bodyBoundingBox.width
                ? bodyBoundingBox.width - selectContentBoundingBox.width
                : triggerBoundingBox.left;
            const y =
              selectContentBoundingBox.height + triggerBoundingBox.bottom >
              bodyBoundingBox.height
                ? triggerBoundingBox.top - selectContentBoundingBox.height
                : triggerBoundingBox.bottom;

            setPos((pos) => {
              return {
                ...pos,
                x,
                y,
              };
            });
          }
        }
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [search]
    );

    const selectedItemCallbackRef = useCallback((selectedItemNode) => {
      selectedItemRef.current = selectedItemNode;
    }, []);
    const activeItemCallbackRef = useCallback((activeItemNode) => {
      activeItemRef.current = activeItemNode;
    }, []);

    useEffect(() => {
      const itemRef =
        selectedItemIdx < 0 || selectedItemIdx === activeItem
          ? activeItemRef.current
          : selectedItemRef.current;
      scrollToItemRef(itemRef);
    }, [activeItem, initializedGroups, scrollToItemRef, selectedItemIdx]);

    const selectedItem =
      !multiple &&
      items?.find((item) => getItemValue({ item, valueAttr }) === value);

    const selectedItems =
      (multiple &&
        Array.isArray(value) &&
        items?.reduce(
          (acc, item) =>
            value.includes(getItemValue({ item, valueAttr }))
              ? [...acc, item]
              : acc,
          [] as Required<SelectProps>["value"][]
        )) ||
      [];

    const toggleOpen = () => {
      if (isOpen) {
        triggerRef.current?.focus();
      } else {
        setSearch("");
      }
      setIsOpen((isOpen) => !isOpen);
    };

    const handleSearchChange: ChangeEventHandler<HTMLInputElement> = (e) => {
      const value = e.target.value;
      setSearch(value);
      setActiveItem(0);
    };

    const decrementSelectedItemIdx = () => {
      setActiveItem((activeItem) =>
        activeItem - 1 < 0 ? (filteredItems?.length ?? 1) - 1 : activeItem - 1
      );
    };

    const incrementSelectedItemIdx = () => {
      setActiveItem((activeItem) =>
        activeItem + 1 > (filteredItems?.length ?? 1) - 1 ? 0 : activeItem + 1
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
          if (e.ctrlKey) break;
          e.preventDefault();
          setValue();
          break;
        }
        case "Home": {
          e.preventDefault();
          setActiveItem(0);
          break;
        }
        case "End": {
          e.preventDefault();
          if (filteredItems) {
            setActiveItem((filteredItems?.length ?? 1) - 1);
          }
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
      setActiveItem(0);
      searchInputRef.current?.focus();
    };

    const setValue = (groupItemIndex?: number, groupName?: string) => {
      const selectedItem =
        groupName && groupItemIndex !== undefined
          ? groupedFilteredItems[groupName ?? UNGROUPED_NAME][groupItemIndex]
              .item
          : Object.values(groupedFilteredItems)
              .flat()
              .find(({ index }) => index === activeItem)?.item;
      if (selectedItem)
        onChange(
          multiple && Array.isArray(value)
            ? Array.from(
                new Set(value).add(
                  getItemValue({ item: selectedItem, valueAttr })
                )
              )
            : getItemValue({ item: selectedItem, valueAttr })
        );
      if (isOpen) toggleOpen();
    };

    const handleClickOutside: MouseEventHandler = () => {
      toggleOpen();
    };

    const handleRemoveItem = (
      event: MouseEvent<Element, globalThis.MouseEvent>,
      item
    ) => {
      event.preventDefault();
      event.stopPropagation();
      if (value && Array.isArray(value))
        onChange(value.filter((v) => v != getItemValue({ item, valueAttr })));
    };

    return (
      <RadixSelect.Root
        value={"" + value}
        // onValueChange={(newValue) => onChange && onChange("" + newValue)}
        disabled={disabled}
        // onOpenChange={handleOpen}
        // open={!isOpen}
      >
        <RadixSelect.Trigger
          ref={triggerRef}
          className={twMerge(
            `inline-flex items-center justify-between rounded-sm px-2 text-sm leading-none ${multiple ? "h-fit py-2" : "h-[35px]"} gap-[5px] enabled:data-placeholder:text-neutral-500 outline-hidden w-full text-neutral-200 bg-neutral-800/80 enabled:hover:bg-neutral-700/80 border border-neutral-700/95 enabled:hover:border-neutral-500 disabled:text-neutral-500 enabled:focus:border-neutral-200 disabled:cursor-not-allowed overflow-hidden transition-colors text-sm`,
            rest.className ?? ""
          )}
          title={title}
          onClick={(e) => {
            toggleOpen();
          }}
          onKeyDown={handleTriggerKeyDown}
        >
          <RadixSelect.Value placeholder={placeholder} asChild>
            {multiple ? (
              <div className="w-full flex flex-col gap-1 pointer-events-auto!">
                {/* //FIXME: Nested buttons in HTML */}
                {selectedItems.map((item) => (
                  <Chip
                    key={getItemValue({ item, valueAttr })}
                    label={getItemLabel({ item, textAttr })}
                    onRemove={(event) => handleRemoveItem(event, item)}
                  />
                ))}
              </div>
            ) : (
              <span className="block text-start truncate disabled:text-neutral-700">
                {selectedItem &&
                  (typeof selectedItem === "object"
                    ? selectedItem[textAttr]
                    : value)}
              </span>
            )}
          </RadixSelect.Value>

          <RadixSelect.Icon className="text-neutral-700 data-highlighted:text-neutral-100 ml-auto" />
        </RadixSelect.Trigger>
        <AnimatePresence initial={false}>
          {isOpen && (
            <Portal.Root>
              <motion.div
                className={
                  "absolute top-0 left-0 w-screen h-screen z-50 overflow-hidden " +
                  (!isOpen ? "pointer-events-none" : "")
                }
                variants={{
                  hidden: { opacity: 0 },
                  visible: { opacity: 1 },
                }}
                transition={{ duration: 0.1 }}
                initial={"hidden"}
                animate={"visible"}
                exit={"hidden"}
              >
                <div
                  className="absolute top-0 left-0 w-full h-full z-10 bg-black/0"
                  onMouseDown={handleClickOutside}
                  ref={modalBodyRef}
                />
                <div
                  className="absolute shadow-md shadow-black/50 mx-auto max-w-md z-50 border-neutral-700 bg-neutral-900/0 border-[1px] rounded-sm border-solid text-sm select-none backdrop-blur-xs overflow-hidden"
                  style={{ top: pos.y, left: pos.x }}
                  ref={selectContentRef}
                >
                  <div className="relative flex align-middle">
                    <Input
                      className="p-3 pe-10 hover:bg-neutral-800/80 w-full transition-all"
                      placeholder="Search"
                      autoFocus
                      value={search}
                      onChange={handleSearchChange}
                      onKeyDown={handleSearchKeydown}
                      ref={searchInputRef}
                      fullWidth
                    />

                    <CrossCircledIcon
                      data-testid="clearSearch"
                      height="24"
                      width="24"
                      className={
                        "absolute end-2 m-0 top-[11px] text-neutral-400 hover:text-neutral-300 transition-all duration-500 cursor-pointer will-change-[filter,opacity] " +
                        (search
                          ? "opacity-100"
                          : "opacity-0 pointer-events-none")
                      }
                      onClick={handleClearSearchClick}
                    />
                  </div>
                  <ScrollArea type="auto" ref={scrollContainerRefCallback}>
                    <div className="max-h-72">
                      {!filteredItems?.length && (
                        <div className="p-3 text-sm text-neutral-400 bg-neutral-900/90">
                          No items
                        </div>
                      )}
                      {Object.keys(groupedFilteredItems)?.map((groupName) => (
                        <div key={groupName} className="h-full">
                          {(groupName !== UNGROUPED_NAME ||
                            groupName === UNGROUPED_NAME) &&
                            (initializedGroups?.length ?? 0) > 1 &&
                            groupedFilteredItems?.[groupName]?.length > 0 && (
                              <div className="font-bold text-lg px-2 text-neutral-200 bg-neutral-900/90 w-[calc(100%_-_8px)] h-full sticky top-0 z-10 pt-1">
                                {groupName}
                              </div>
                            )}
                          <ul className="relative flex flex-col bg-neutral-900/90 overflow-ellipsis ">
                            {groupedFilteredItems?.[groupName]?.map(
                              (
                                { item, index: itemIndex, groupItemIndex },
                                index
                              ) => {
                                itemIndex ??= index;
                                const isMultipleAndItemSelected =
                                  multiple &&
                                  isArray(value) &&
                                  value?.some(
                                    (v) =>
                                      getItemValue({ item, valueAttr }) === v
                                  );

                                return (
                                  <li
                                    // role="listitem"
                                    ref={
                                      selectedItemIdx === itemIndex
                                        ? activeItemCallbackRef
                                        : itemIndex === activeItem
                                          ? selectedItemCallbackRef
                                          : undefined
                                    }
                                    key={
                                      (rest?.name ?? "") +
                                      (typeof item === "object"
                                        ? item?.[idAttr]
                                        : item) +
                                      index
                                    }
                                    className={
                                      "flex justify-between p-2 first:rounded-t-none last:rounded-b-sm transition-colors duration-75 truncate " +
                                      (itemIndex === selectedItemIdx &&
                                      activeItem === itemIndex
                                        ? "bg-neutral-100"
                                        : itemIndex === selectedItemIdx
                                          ? "bg-neutral-800/50"
                                          : activeItem === itemIndex
                                            ? "bg-neutral-100 text-neutral-900"
                                            : "hover:bg-neutral-900/70") +
                                      (selectedItemIdx === itemIndex ||
                                      isMultipleAndItemSelected
                                        ? " text-primary"
                                        : "")
                                    }
                                    title={
                                      typeof item === "object"
                                        ? item?.[textAttr]
                                        : item
                                    }
                                    // onClick={() =>
                                    //   setValue(groupItemIndex, groupName)
                                    // }
                                    onMouseUp={() =>
                                      setValue(groupItemIndex, groupName)
                                    }
                                    onMouseEnter={() =>
                                      setActiveItem(itemIndex)
                                    }
                                  >
                                    <div className="flex gap-3">
                                      {typeof item === "object"
                                        ? item?.[textAttr]
                                        : item}
                                      {isMultipleAndItemSelected && (
                                        <CheckIcon className="text-primary size-5" />
                                      )}
                                    </div>
                                  </li>
                                );
                              }
                            )}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </motion.div>
            </Portal.Root>
          )}
        </AnimatePresence>
      </RadixSelect.Root>
    );
  }
);

Select.displayName = "Select";
export default Select;
