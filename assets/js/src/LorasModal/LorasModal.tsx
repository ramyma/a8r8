import useModels from "../hooks/useModels";
import Modal, { ModalProps } from "../components/Modal";
import useGlobalKeydown from "../hooks/useGlobalKeydown";
import Button from "../components/Button";
import Input from "../components/Input";
import useLoras from "../hooks/useLoras";
import { Lora } from "../App.d";
import { checkIsSdXlModel } from "../utils";
import {
  ChangeEventHandler,
  KeyboardEventHandler,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useTransition,
  animated,
  config,
  useSpring,
  useSpringRef,
  useChain,
  useScroll,
} from "@react-spring/web";
import debounce from "lodash.debounce";
import { LoraButton } from "./LoraButton";
import useFuzzySearch from "../hooks/useFuzzySearch";

const LorasModal = (props: ModalProps) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const lorasContainerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState<{
    width: number;
    height: number;
  }>();

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
    if (lorasContainerElem && props.isOpen) {
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
  }, [handleContainerResize, props.isOpen]);

  const { loras, fetchData: fetchLoras } = useLoras({
    fetchPolicy: "eager",
  });

  const { selectedModel } = useModels();

  const [filterText, setFilterText] = useState("");

  const { filteredItems: filteredLoras } = useFuzzySearch(
    loras ?? [],

    {
      filter: filterText,
      options: {
        keys: ["name"],
      },
    }
  );

  // console.log({ loras, filteredLoras });

  const [activeLora, setActiveLora] = useState<Lora>();

  const isSdXlModel = checkIsSdXlModel(selectedModel.name);

  // const [filteredLoras, setFilteredLoras] = useState(loras);

  // const filteredLoras = useMemo(
  //   () =>
  //     loras
  //       ?.filter(({ name }) => name.includes(filterText))
  //       ?.toSorted((x, y) =>
  //         x.name.toLowerCase() < y.name.toLowerCase()
  //           ? -1
  //           : x.name.toLowerCase() > y.name.toLowerCase()
  //             ? 1
  //             : 0
  //       ),
  //   [loras, filterText]
  // );
  const transitionsSpringRef = useSpringRef();
  const loraItemWidth = (containerDimensions?.width ?? 200) / 5;
  const loraItemHeight = 200; //(containerDimensions?.height ?? 0) / 200;
  const gridItems = useMemo(
    () =>
      filteredLoras?.map((lora, index) => ({
        lora,
        x: (index % 5) * loraItemWidth,
        y: Math.floor(index / 5) * loraItemHeight,
        active: lora.name === activeLora?.name,
        index,
      })) ?? [],
    [filteredLoras, loraItemWidth, loraItemHeight, activeLora]
  );

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  // console.log(scrollAreaRef?.current?.scrollTop);
  const x = useScroll({ container: scrollAreaRef.current });
  // console.log({ x }, scrollAreaRef.current);
  const transitions = useTransition(gridItems, {
    from: ({ x, y }) => ({
      opacity: 0,
      scale: 0.8,
      x,
      y,
      height: 150,
    }),
    enter: ({ x, y }) => ({
      opacity: 1,
      scale: 1,
      x,
      y,
      width: "18.3%",
      height: 150,
      detailsOpacity: 0,
    }),
    update: ({ active, x, y }) => ({
      opacity: activeLora ? (active ? 1 : 0) : 1,
      scale: 1,
      x: active ? 0 : x,
      y: active ? Math.max(0, scrollAreaRef?.current?.scrollTop ?? 0 - 100) : y,
      width: active ? "100%" : "18.3%",
      height: active ? window.innerHeight * 0.75 : 150,
      detailsOpacity: activeLora && active ? 1 : 0,
      detailsX: active ? 300 : 100,
      pointerEvents: activeLora ? "none" : "auto",
    }),

    leave: ({ x, y }, index) => ({
      scale: 0.8,
      opacity: 0,
      x,
      y,
    }),

    // trail: 5,
    keys: ({ lora }) => lora.name,
    config: { ...config.gentle, friction: 21 },
    // ref: transitionsSpringRef,
    // reset: !props.isOpen,
  });
  useEffect(() => {
    props.isOpen && searchInputRef.current?.focus();
  }, [props.isOpen]);

  useGlobalKeydown({
    handleKeydown: (event) => {
      if (props.isOpen) {
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

  return (
    <Modal
      {...props}
      className={
        "relative h-full flex flex-col justify-between gap-4 items-baseline " +
        (props.className ?? "")
      }
      childSpringRef={transitionsSpringRef}
      scrollAreaRef={scrollAreaRef}
    >
      <div className="flex sticky top-0 place-items-center justify-between w-full z-20">
        {activeLora && (
          <Button
            className={`${activeLora ? "opacity-100" : "opacity-0"} transition-opacity`}
            onClick={() => setActiveLora(undefined)}
          >
            Back
          </Button>
        )}
        <div
          className={`${activeLora ? "opacity-0" : "opacity-100"} flex justify-between w-full transition-opacity`}
        >
          <Input
            className="p-2"
            ref={searchInputRef}
            onChange={handleFilterTextChange}
            onKeyDown={handleFilterTextKeyDown}
            onClear={handleFilterTextClear}
            value={filterText}
            placeholder="Search"
          />
          <Button className="flex-3" onClick={handleRefreshLoras}>
            Refresh
          </Button>
        </div>
      </div>
      <div
        className="relative w-full text-center inline-flex flex-wrap gap-5 justify-stretch content-start"
        ref={lorasContainerRef}
      >
        {transitions((style, { active, lora, index }) => (
          <animated.div style={style} className="absolute flex">
            <LoraButton
              {...lora}
              isSdXlModel={isSdXlModel}
              onClick={() => setActiveLora(lora)}
              onClose={(e) => setActiveLora(undefined)}
              active={active}
            />
          </animated.div>
        ))}
      </div>
    </Modal>
  );
};

export default LorasModal;
