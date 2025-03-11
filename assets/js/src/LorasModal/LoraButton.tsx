import { animated, useSpring } from "@react-spring/web";
import Button, { ButtonProps } from "../components/Button";
import { Lora } from "../App.d";
import LoraDetails from "./LoraDetails";
import { PlusIcon, TrashIcon } from "@radix-ui/react-icons";
import { AnimatePresence, motion } from "motion/react";
import { MouseEventHandler } from "react";
import { addLora, removeLora } from "../state/lorasSlice";
import { useAppDispatch } from "../hooks";

export const LoraButton = ({
  active,
  lora,
  onClick,
  onClose,
  setFilterText,
  selectedLorasByPath,
  hasActiveLora,
}: {
  lora: Lora;
  onClick: ButtonProps["onClick"];
  active: boolean;
  setFilterText: React.Dispatch<React.SetStateAction<string>>;
  onClose: () => void;
  selectedLorasByPath: Record<string, number>;
  hasActiveLora: boolean;
}) => {
  const dispatch = useAppDispatch();

  const {
    name,
    path,
    alias,
    metadata: { ss_base_model_version: baseModel, ss_sd_model_name } = {},
    metadata = {},
    stored_metadata: storedMetadata,
    model_type: modelType,
  } = lora;

  const isPony = modelType === "pony";
  //   (storedMetadata?.baseModel || name)?.toLowerCase().includes("pony") ||
  //   ss_sd_model_name?.toLowerCase().includes("pony");
  // baseModel?.toLowerCase().includes("pony");

  const isSdXl = modelType === "sdxl";
  //   !isPony &&
  //   ((storedMetadata?.baseModel || name)?.toLowerCase().includes("xl") ||
  //     ss_sd_model_name?.toLowerCase().includes("xl") ||
  //     baseModel?.toLowerCase().includes("xl"));
  const isFlux = modelType === "flux";
  //   (storedMetadata?.baseModel || name)?.toLowerCase().includes("flux") ||
  //   ss_sd_model_name?.toLowerCase().includes("flux") ||
  //   baseModel?.toLowerCase().includes("flux");

  const isSd35 = modelType === "sd3.5";
  //   (storedMetadata?.baseModel || name)?.toLowerCase().includes("3.5") ||
  //   ss_sd_model_name?.toLowerCase().includes("3.5") ||
  //   baseModel?.toLowerCase().includes("3.5");

  const isDisabled = false; //isSdXlModel && !isSdXl;

  const detailsStyle = useSpring({
    to: {
      opacity: active ? 1 : 0,
      x: 0,
      y: active ? 0 : 100,
      pointerEvents: active ? "auto" : "none",
    },
  });

  const selectedLoraIndex = selectedLorasByPath?.[lora.path];
  const isLoraSelected = selectedLoraIndex !== undefined;

  const handleAddOrRemove: MouseEventHandler = (event) => {
    event.stopPropagation();
    if (isLoraSelected && selectedLoraIndex !== undefined)
      dispatch(removeLora(selectedLoraIndex));
    else dispatch(addLora(lora.path));
  };

  return (
    <>
      <div
        key={name}
        className={`relative h-full flex flex-col items-start gap-5 p-4 text-sm text-wrap select-none rounded-sm bg-neutral-800/70 border border-neutral-800 w-full overflow-hidden place-items-center ease-in-out duration-300 transition-all  ${active ? "cursor-auto" : !hasActiveLora ? "hover:cursor-pointer hover:border-neutral-600 " : ""}`}
        onClick={onClick}
        disabled={isDisabled}
      >
        <div
          className={`flex flex-col gap-1 z-3 text-lg font-semibold shrink-0 text-white text-shadow-sm shadow-black text-start max-w-[85%] break-words text-wrap overflow-hidden ${active ? "select-text!  z-10" : ""}`}
        >
          <span>{alias}</span>

          <span className={`${alias ? "text-sm" : ""}`}>
            {alias && "("}
            {name}
            {alias && ")"}
          </span>
        </div>
        <div
          className={`z-3 absolute right-0 top-0 ${
            isDisabled
              ? "bg-neutral-900/40"
              : isPony
                ? "bg-pink-800/80 text-pink-50"
                : isSdXl
                  ? "bg-green-800/80 text-green-50"
                  : isFlux
                    ? "bg-purple-800/80 text-purple-50"
                    : isSd35
                      ? "bg-amber-500/80 text-amber-50"
                      : "bg-orange-700/80 text-orange-50"
          } p-2 rounded`}
        >
          {isPony
            ? "Pony"
            : isSdXl
              ? "SDXL"
              : isFlux
                ? "Flux"
                : isSd35
                  ? "SD 3.5"
                  : "SD 1.5"}
        </div>
        <>
          {!active && storedMetadata?.images?.[0] && (
            <div className="absolute h-full w-full pointer-events-none bg-linear-to-b from-black/80 to-transparent to-70% z-2 top-0 left-0" />
          )}
          <AnimatePresence>
            <>
              {!active &&
                (storedMetadata?.images?.[0].type === "image" ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    exit={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    // style={{
                    //   backgroundImage: `url(${storedMetadata?.images?.[0].url}`,
                    // }}
                    className={`absolute z-1 top-0 left-0 size-full bg-black/80 rounded-sm overflow-hidden ${storedMetadata?.images?.[0].nsfwLevel > 2 ? "blur-md" : ""}`}
                  >
                    <img
                      className="object-cover bg-no-repeat size-full object-center"
                      src={storedMetadata?.images?.[0].url}
                      loading="lazy"
                      decoding="async"
                    />
                  </motion.div>
                ) : (
                  // <motion.div
                  //   initial={{ opacity: 0 }}
                  //   exit={{ opacity: 0 }}
                  //   animate={{ opacity: 1 }}
                  //   className="absolute z-1 top-0 left-0 size-full bg-black/80 object-cover rounded-sm"
                  // >
                  //   {/* <BlurHashCanvas hash={storedMetadata?.images?.[0].hash} /> */}
                  // </motion.div>
                  <motion.video
                    className="absolute z-1 top-0 left-0 size-full object-cover rounded-sm"
                    src={storedMetadata?.images?.[0].url}
                    autoPlay
                    loop
                    muted
                  />
                ))}

              <Button
                className={`absolute ${active ? "bottom-4 end-8" : "bottom-2 end-2"} z-10 ${isLoraSelected ? "bg-danger/90! hover:bg-red-500/90!" : "bg-green-600/90! hover:bg-green-500/90!"} hover:text-white! shadow-md shadow-black/20 pointer-events-auto backdrop-blur-md`}
                variant="clear"
                onClick={handleAddOrRemove}
                title={isLoraSelected ? "Remove Lora" : "Use Lora"}
              >
                {isLoraSelected ? <TrashIcon /> : <PlusIcon />}
              </Button>
            </>
          </AnimatePresence>
        </>
        {active && (
          <animated.div
            style={detailsStyle}
            className={`flex flex-col gap-4 w-full h-full ${active ? "" : "pointer-events-none"} overflow-hidden`}
          >
            <LoraDetails
              name={name}
              metadata={metadata}
              path={path}
              stored_metadata={storedMetadata}
              setFilterText={setFilterText}
              closeActive={onClose}
            />
          </animated.div>
        )}
      </div>
      {/* <Button
        className={`pointer-events-auto absolute top-[-12px] left-[-12px] bg-neutral-800/70 border border-neutral-700 flex place-content-center ${active ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={(e) => {
          e.stopPropagation();
          active && onClose();
        }}
      >
        <ExitFullScreenIcon />
      </Button> */}
    </>
  );
};
