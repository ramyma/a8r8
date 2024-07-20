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
  useEffect,
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
} from "@react-spring/web";
import debounce from "lodash.debounce";
import useCivit, { CivitModel } from "../hooks/useCivit";
import { LoraButton } from "./LoraButton";

const LorasModal = (props: ModalProps) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { loras, fetchData: fetchLoras } = useLoras();

  const { selectedModel } = useModels();

  const [filterText, setFilterText] = useState("");

  const [activeLora, setActiveLora] = useState<Lora>();

  const isSdXlModel = checkIsSdXlModel(selectedModel.name);

  const filteredLoras = useMemo(
    () =>
      loras
        ?.filter(({ name }) => name.includes(filterText))
        ?.toSorted((x, y) =>
          x.name.toLowerCase() < y.name.toLowerCase()
            ? -1
            : x.name.toLowerCase() > y.name.toLowerCase()
              ? 1
              : 0
        ),
    [loras, filterText]
  );

  const transitionsSpringRef = useSpringRef();
  const gridItems = useMemo(
    () =>
      filteredLoras?.map((lora, index) => ({
        lora,
        x: (index % 5) * 200,
        y: Math.floor(index / 5) * 200,
        active: lora.name === activeLora?.name,
        index,
      })) ?? [],
    [filteredLoras, filterText, activeLora]
  );

  const transitions = useTransition(gridItems, {
    from: ({ x, y }) => ({
      opacity: 0,
      scale: 0.8,
      x,
      y,
      height: 175.31,
    }),
    enter: ({ x, y }) => ({
      opacity: 1,
      scale: 1,
      x,
      y,
      width: "18.3%",
      height: 175.31,
      detailsOpacity: 0,
    }),
    update: ({ active, x, y }) => ({
      opacity: activeLora ? (active ? 1 : 0) : 1,
      scale: 1,
      x: active ? 0 : x,
      y: active ? 0 : y,
      width: active ? "100%" : "18.3%",
      height: active ? 600 : 175.31,
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
    debugger;
    setFilterText(event.target.value);
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
    >
      <div className="flex place-items-center justify-between w-full z-20">
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
            value={filterText}
          />
          <Button className="flex-3" onClick={handleRefreshLoras}>
            Refresh
          </Button>
        </div>
      </div>
      <div className="relative w-full text-center inline-flex flex-wrap gap-5 justify-stretch content-start">
        {transitions((style, { active, lora, index }) => (
          <animated.div style={style} className="absolute flex">
            <LoraButton
              {...lora}
              isSdXlModel={isSdXlModel}
              onClick={() => setActiveLora(lora)}
              active={active}
            />
          </animated.div>
        ))}
      </div>
    </Modal>
  );
};

export default LorasModal;
