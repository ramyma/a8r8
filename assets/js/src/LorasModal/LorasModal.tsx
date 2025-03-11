import Modal, { ModalProps } from "../components/Modal";
import useGlobalKeydown from "../hooks/useGlobalKeydown";
import Button from "../components/Button";
import Input from "../components/Input";
import useLoras from "../hooks/useLoras";
import { Lora } from "../App.d";
import {
  ChangeEventHandler,
  KeyboardEventHandler,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { AnimatePresence, motion } from "motion/react";
import debounce from "lodash.debounce";
import { LoraButton } from "./LoraButton";
import useFuzzySearch from "../hooks/useFuzzySearch";
import { useCustomEventListener } from "react-custom-events";
import { useSelector } from "react-redux";
import {
  selectLoras,
  selectShowNsfwLoras,
  toggleNsfwLoras,
} from "../state/lorasSlice";
import Switch from "../Switch";
import { useAppDispatch, useAppSelector } from "../hooks";
import Select from "../components/Select";
import Content from "../components/Content";
import { ChevronLeftIcon } from "@radix-ui/react-icons";
import { selectSelectedModel } from "../state/optionsSlice";

const GRID_GAP_X = 16;
const MODEL_TYPES = [
  { label: "All", value: "all" },
  { label: "Flux", value: "flux" },
  { label: "Pony", value: "pony" },
  { label: "SD 1.5", value: "sd1.5" },
  { label: "SD 3.5", value: "sd3.5" },
  { label: "SDXL", value: "sdxl" },
];

const LorasModal = (props: ModalProps) => {
  const [modelTypeFilter, setModelTypeFilter] = useState("all");

  const dispatch = useAppDispatch();
  const showNsfwLoras = useAppSelector(selectShowNsfwLoras);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const lorasContainerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState<{
    width: number;
    height: number;
  }>();

  const selectedLoras = useSelector(selectLoras);
  const selectedModel = useSelector(selectSelectedModel);

  const handleContainerResize: ResizeObserverCallback = useCallback(
    (entries) => {
      const bBox = entries?.[0]?.contentRect; //lorasContainerRef.current?.getBoundingClientRect();
      if (bBox) {
        setContainerDimensions({
          width: Math.max(window.innerWidth * 0.5, bBox.width),
          height: bBox.height,
        });
      }
    },
    []
  );

  useLayoutEffect(() => {
    const lorasContainerElem = lorasContainerRef.current;
    if (lorasContainerElem && props.open) {
      const bBox = lorasContainerRef.current?.getBoundingClientRect();
      setContainerDimensions({ width: bBox.width, height: bBox.height });
      const resizeObserver = new ResizeObserver(
        debounce(handleContainerResize, 300)
      );

      resizeObserver.observe(lorasContainerElem);
      return () => {
        resizeObserver.unobserve(lorasContainerElem);
      };
    }
  }, [handleContainerResize, props.open]);

  const { loras, fetchData: fetchLoras } = useLoras();

  const [filterText, setFilterText] = useState("");

  const { filteredItems } = useFuzzySearch(
    loras ?? [],

    {
      filter: filterText,
      options: {
        keys: ["name", "alias"],
        threshold: 0.4,
      },
    }
  );

  const filteredLoras = filteredItems?.filter(
    ({ stored_metadata, model_type }) =>
      (!stored_metadata?.model?.nsfw || showNsfwLoras) &&
      (modelTypeFilter === "all" ||
        model_type === modelTypeFilter.toLocaleLowerCase())
  );

  const [activeLora, setActiveLora] = useState<Lora>();

  useCustomEventListener("setActiveLora", (lora: Lora) => {
    setFilterText("");
    setActiveLora(lora);

    const updateModelTypeFilter =
      lora?.model_type ?? selectedModel?.modelType ?? "all";
    updateModelTypeFilter !== modelTypeFilter &&
      setModelTypeFilter(updateModelTypeFilter);
  });

  const loraItemWidth =
    (((window.innerWidth ?? 64) - 64 + GRID_GAP_X / 2) * 0.95) / 5 -
      GRID_GAP_X || 200;

  const loraItemHeight = Math.max(loraItemWidth - 100, 300);

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    props.open && searchInputRef.current?.focus();
  }, [props.open]);

  useGlobalKeydown({
    handleKeydown: (event) => {
      if (props.open) {
        event.stopPropagation();
        if (event.key === "Escape") props.onClose(event);
        if (event.key === "/") {
          event.preventDefault();
          searchInputRef.current?.focus();
        }
      }
    },
    override: true,
  });

  const handleRefreshLoras = () => {
    fetchLoras();
  };

  const handleFilterTextChange: ChangeEventHandler<HTMLInputElement> = (
    event
  ) => {
    const value = event.target.value;
    setFilterText(value);
  };

  const handleFilterTextClear = () => {
    setFilterText("");
  };

  const handleFilterTextKeyDown: KeyboardEventHandler = (event) => {
    if (event.key === "Escape") props.onClose(event);
  };

  const toggleShowNsfw = () => {
    dispatch(toggleNsfwLoras());
  };

  const variants = {
    open: {
      transition: { staggerChildren: 0.07, delayChildren: 0.2 },
    },
    closed: {
      transition: { staggerChildren: 0.05, staggerDirection: -1 },
    },
  };

  const initialAnimationRef = useRef(false);

  const selectedLorasByPath = selectedLoras?.reduce(
    (acc: Record<string, number>, { path }, index) => ({
      ...acc,
      [path]: index,
    }),
    {}
  );

  const handleModelTypeChange = (modelType) => {
    setModelTypeFilter(modelType);
  };

  return (
    <Modal
      {...props}
      className={
        "h-full flex flex-col justify-between gap-4 items-baseline " +
        (props.className ?? "")
      }
      scrollAreaRef={scrollAreaRef}
      disableScroll={!!activeLora}
    >
      <div
        className="flex flex-col h-full w-full gap-5"
        style={{
          minHeight:
            Math.ceil((filteredLoras?.length ?? 0) / 5) * loraItemHeight + 32,
        }}
      >
        <div className="flex sticky top-0 place-items-center justify-between w-[calc(100%_+_64px)] z-20 grow-0 shrink bg-neutral-950/80 border-b border-neutral-800/90 backdrop-blur-xs px-8 py-4 ms-[-32px] mt-[-32px]">
          <AnimatePresence>
            <div className="flex justify-between w-full transition-opacity">
              {activeLora ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Button
                    className={`${activeLora ? "opacity-100" : "opacity-0"} transition-opacity place-items-center gap-1`}
                    onClick={() => setActiveLora(undefined)}
                  >
                    <ChevronLeftIcon />
                    <span>Back</span>
                  </Button>
                </motion.div>
              ) : (
                <Input
                  className={`${activeLora ? "opacity-0" : "opacity-100"} p-2 pe-[40px]`}
                  ref={searchInputRef}
                  onChange={handleFilterTextChange}
                  onKeyDown={handleFilterTextKeyDown}
                  onClear={handleFilterTextClear}
                  value={filterText}
                  placeholder="Search"
                  autoFocus
                />
              )}
              <div className="flex justify-between place-items-center gap-5 justify-self-end">
                <AnimatePresence>
                  {!activeLora && (
                    <motion.div
                      initial={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <Select
                        items={MODEL_TYPES}
                        value={modelTypeFilter}
                        onChange={handleModelTypeChange}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
                <Switch onChange={toggleShowNsfw} value={showNsfwLoras}>
                  NSFW
                </Switch>
                <Button className="flex-3" onClick={handleRefreshLoras}>
                  Refresh
                </Button>
              </div>
            </div>
          </AnimatePresence>
        </div>
        <Content>
          <motion.div
            // variants={variants}
            className="relative w-full text-center inline-flex flex-wrap gap-5 justify-stretch content-start flex-1 shrink-0"
            ref={lorasContainerRef}
          >
            {/* {transitions((style, { active, lora, index }) => ( */}
            <AnimatePresence mode="popLayout">
              {filteredLoras?.map((lora, index) => {
                const active = lora.path === activeLora?.path;
                return (
                  <motion.div
                    key={lora.path ?? lora.name + index}
                    initial={{
                      scale: 1,
                      opacity: 0,
                      width: active ? "100%" : loraItemWidth,
                      height: active
                        ? window.innerHeight * 0.75
                        : loraItemHeight - 20,
                      x: active
                        ? 0
                        : (index % 5) * loraItemWidth +
                          (index % 5) * GRID_GAP_X,
                      y: active
                        ? Math.max(
                            0,
                            scrollAreaRef?.current?.scrollTop ?? 0 - 100
                          )
                        : Math.floor(index / 5) * loraItemHeight,
                    }}
                    animate={active ? "active" : "grid"}
                    variants={{
                      active: {
                        scale: 1,
                        opacity: 1,
                        width: "100%",
                        height: window.innerHeight * 0.78,
                        x: 0,
                        y: Math.max(
                          0,
                          scrollAreaRef?.current?.scrollTop ?? 0 - 100
                        ),
                        // detailsOpacity: activeLora && active ? 1 : 0,
                        // detailsX: active ? 300 : 100,
                        // pointerEvents: activeLora ? "none" : "auto",
                        transition: {
                          bounce: 0.15,
                          duration: 0.5,
                          type: "spring",
                        },
                      },
                      grid: {
                        scale: 1,
                        opacity: activeLora ? 0 : 1,
                        width: loraItemWidth,
                        height: loraItemHeight - 20,
                        x:
                          (index % 5) * loraItemWidth +
                          (index % 5) * GRID_GAP_X,
                        y: Math.floor(index / 5) * loraItemHeight,
                        // detailsOpacity: activeLora && active ? 1 : 0,
                        // detailsX: active ? 300 : 100,
                        // pointerEvents: activeLora ? "none" : "auto",
                        transition: {
                          bounce: 0.2,
                          mass: 0.3,
                          // damping: 18,
                          // duration: 0.8, // +
                          // (initialAnimationRef.current ? 0 : Math.random() * 1.8),
                          type: "spring",
                        },
                      },
                    }}
                    // exit={{ opacity: 0 }}
                    // variants={{
                    //   open: {
                    //     y: 0,
                    //     opacity: 1,
                    //     transition: {
                    //       y: { stiffness: 1000, velocity: -100 },
                    //     },
                    //   },
                    //   closed: {
                    //     y: 50,
                    //     opacity: 0,
                    //     transition: {
                    //       y: { stiffness: 1000 },
                    //     },
                    //   },
                    // }}
                    className="absolute flex"
                    style={{
                      // opacity: activeLora ? (active ? 1 : 0) : 1,
                      scale: 1,
                      x: active ? 0 : (index % 5) * loraItemWidth,
                      y: active
                        ? Math.max(
                            0,
                            scrollAreaRef?.current?.scrollTop ?? 0 - 100
                          )
                        : Math.floor(index / 5) * loraItemHeight,
                      width: active ? "100%" : "18.3%",
                      height: active ? window.innerHeight * 0.75 : 150,
                      detailsOpacity: activeLora && active ? 1 : 0,
                      detailsX: active ? 300 : 100,
                      pointerEvents: activeLora ? "none" : "auto",
                    }}
                  >
                    <LoraButton
                      lora={lora}
                      onClick={() => setActiveLora(lora)}
                      onClose={() => setActiveLora(undefined)}
                      active={active}
                      setFilterText={setFilterText}
                      selectedLorasByPath={selectedLorasByPath}
                      hasActiveLora={!!activeLora}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        </Content>
      </div>
    </Modal>
  );
};

export default LorasModal;
