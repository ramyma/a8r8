import React, { ChangeEventHandler, useEffect, useRef, useState } from "react";
import Button from "../components/Button";
import useCivit from "../hooks/useCivit";
import { Lora } from "../App.d";
import ScrollArea from "../components/ScrollArea";
import TriggerWord from "./TriggerWord";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
} from "@radix-ui/react-icons";
import { AnimatePresence, motion } from "motion/react";
import Input from "../components/Input";
import Label from "../components/Label";
import throttle from "lodash.throttle";
import Link from "../components/Link";
import { useAppSelector } from "../hooks";
import {
  selectShowNsfwLoraImages,
  selectShowNsfwLoras,
} from "../state/lorasSlice";

type Props = Partial<Lora> & {
  setFilterText: React.Dispatch<React.SetStateAction<string>>;
  closeActive?: () => void;
};

const LoraDetails = ({
  alias,
  name,
  metadata,
  path,
  stored_metadata,
  setFilterText,
  closeActive,
}: Props) => {
  const [isLoading, setIsLoading] = useState(false);

  const { getModelByHash } = useCivit();
  const [activeImage, setActiveImage] = useState<number>();
  const imagesContRef = useRef<HTMLDivElement>(null);
  const showNsfwLoraImages = useAppSelector(selectShowNsfwLoraImages);
  const showNsfwLoras = useAppSelector(selectShowNsfwLoras);

  const processedImages = stored_metadata?.images
    ?.filter(
      ({ nsfwLevel }) => (showNsfwLoras && showNsfwLoraImages) || nsfwLevel < 3
    )
    ?.map((image, index) => ({
      ...image,
      isActive: index === activeImage,
      // scale: index === activeImage ? 2 : 1,
      index,
      pointerEvents: name
        ? activeImage != undefined
          ? index === activeImage
            ? "auto"
            : "none"
          : "auto"
        : "none",
      width:
        activeImage != undefined
          ? index === activeImage
            ? "100%"
            : "33%"
          : "33%",
      height: 200,
      x:
        index === activeImage
          ? 0
          : ((index % 3) *
              (imagesContRef.current?.getBoundingClientRect()?.width ?? 0)) /
            3,
      y: index === activeImage ? 0 : Math.floor(index / 3) * (200 + 8),
    }));
  // const transitions = useTransition(processedImages ?? [], {
  //   initial: ({ isActive, scale, x, y, width, pointerEvents }) => ({
  //     isActive,
  //     // scale,
  //     // x,
  //     // y,
  //     // width: 200,
  //     x,
  //     y,
  //     width,
  //     height: 200,
  //     pointerEvents,
  //     zIndex: 5,
  //   }),
  //   enter: ({ x, y, width, pointerEvents }) => ({
  //     scale: 1,
  //     opacity: 1,
  //     x,
  //     y,
  //     width,
  //     height: 200,
  //     pointerEvents,
  //     zIndex: 5,
  //   }),
  //   leave: {
  //     scale: 0.7,
  //     opacity: 0,
  //   },
  //   update: ({ x, y, isActive, scale, pointerEvents, width, index }) => ({
  //     isActive,
  //     // scale,
  //     x,
  //     y,
  //     width,
  //     height: isActive ? 600 : 200,
  //     pointerEvents,
  //     opacity: activeImage != undefined ? (isActive ? 1 : 0) : 1,
  //     scale: activeImage != undefined ? (isActive ? 1 : 0.9) : 1,
  //     // config: (key) => {
  //     //   if (isActive && ["width", "height", "x", "y"].includes(key)) {
  //     //     return {
  //     //       duration: 0,
  //     //       // ...config.gentle,
  //     //     };
  //     //   }

  //     //   return config.default;
  //     // },
  //   }),
  //   keys: ({ hash }) => hash,
  //   // trail: 3,
  // });

  const [imageContainerWidth, setImageContainerWidth] = useState<number>();

  const updateContainerWidth = throttle((width) => {
    setImageContainerWidth(width);
  }, 100);

  useEffect(() => {
    if (imagesContRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        const newWidth = entries?.[0].target.getBoundingClientRect().width;
        updateContainerWidth(newWidth);
      });
      resizeObserver.observe(imagesContRef.current);
      return () => {
        imagesContRef.current &&
          resizeObserver.unobserve(imagesContRef.current);
      };
    }
  }, []);

  const [customHash, setCustomHash] = useState<string>(
    stored_metadata?.files?.[0].hashes.AutoV2 ??
      metadata?.sshs_model_hash?.substring(0, 12) ??
      ""
  );
  const handleHashChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    setCustomHash(event.target.value);
  };

  return (
    <div className="relative flex content-around gap-5 h-full pt-1">
      <div className="h-full flex gap-5 flex-1">
        <div className="flex h-full flex-1 w-[15%] pb-6">
          <ScrollArea type="auto">
            <div className="flex flex-col gap-5 pe-4 pb-5">
              {stored_metadata?.model?.name && (
                <div className="flex flex-col gap-2 items-start text-start">
                  <label className="font-bold">Model Name:</label>
                  <div className="flex flex-wrap gap-2 select-text">
                    {stored_metadata?.model.name}
                    <Link
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setFilterText(stored_metadata?.model.name);

                        closeActive?.();
                      }}
                      className="cursor-pointer"
                    >
                      Versions
                    </Link>
                  </div>
                </div>
              )}
              {stored_metadata?.model?.name && (
                <div className="flex flex-col gap-2 items-start text-start select-text">
                  <label className="font-bold">Version Name:</label>
                  <div className="flex flex-wrap gap-2">
                    {stored_metadata?.name}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 items-start">
                <label className="font-bold">Trigger words:</label>
                <ScrollArea type="auto">
                  <div className="flex flex-wrap gap-2 max-h-[10rem] pe-6">
                    {stored_metadata?.trainedWords?.map((word, index) => (
                      <TriggerWord key={`${word}${index}`}>{word}</TriggerWord>
                    ))}
                    {!stored_metadata?.trainedWords?.length && <div>-</div>}
                  </div>
                </ScrollArea>
              </div>
              <div className="flex gap-5">
                <Label className="text-start flex-1">
                  Hash
                  <Input
                    name="hash"
                    onChange={handleHashChange}
                    value={customHash}
                  />
                </Label>
                <Button
                  className="flex-2"
                  onClick={async () => {
                    try {
                      setIsLoading(true);
                      if (customHash) {
                        await getModelByHash(customHash, path);
                      } else if (metadata?.sshs_model_hash) {
                        await getModelByHash(
                          metadata?.sshs_model_hash.substring(0, 12),
                          path
                        );
                      }
                    } catch (_) {
                      //
                      setIsLoading(false);
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  disabled={
                    isLoading || (!metadata?.sshs_model_hash && !customHash)
                  }
                >
                  Fetch from Civit
                </Button>
              </div>
              {stored_metadata && (
                <Link
                  href={`https://civitai.com/models/${stored_metadata.modelId}?modelVersionId=${stored_metadata.id}`}
                  external
                >
                  View on Civit
                </Link>
              )}
              {/* {stored_metadata && (
          <div
            dangerouslySetInnerHTML={{ __html: stored_metadata.description }}
          />
        )} */}

              {/* {lora.metadata.ss_tag_frequency.map((tag) => tag)} */}
              {/* <span>{name}</span> */}
              {/* <span>{metadata?.sshs_model_hash}</span>
        <span>{metadata?.sshs_legacy_hash}</span> */}
            </div>
          </ScrollArea>
        </div>
        <ScrollArea
          className="w-full flex-grow-5 mb-5"
          scrollBarClassNames="z-10"
        >
          <div
            className="relative w-full flex-1" //  border border-neutral-700 rounded-xs" //p-5 h-[20vh] "
            /*"grid grid-cols-3 gap-2 "8*/ ref={imagesContRef}
            style={{
              height: processedImages?.length
                ? Math.ceil(processedImages.length / 3) * 200 +
                  Math.ceil(processedImages.length / 3) * 8 +
                  8
                : 0,
            }}
          >
            <AnimatePresence mode="popLayout">
              {processedImages?.map(
                (
                  {
                    hash,
                    x,
                    y,
                    width,
                    height,
                    pointerEvents,
                    isActive,
                    type,
                    url,
                    meta,
                    nsfwLevel,
                  },
                  index
                ) => (
                  <motion.div
                    key={url || hash || index}
                    className={`absolute bg-contain bg-no-repeat bg-center rounded-sm border border-neutral-700 bg-black/70 cursor-pointer ${index !== activeImage ? "pointer-events-none" : ""}`}
                    initial={{
                      x,
                      y,
                      width,
                      height: 200,
                      pointerEvents,
                      zIndex: 5,
                      opacity: 0,
                    }}
                    enter={{
                      scale: 1,
                      opacity: 1,
                      x,
                      y,
                      width,
                      height: 200,
                      pointerEvents,
                      zIndex: 5,
                    }}
                    exit={{ opacity: 0 }}
                    animate={{
                      width:
                        activeImage != undefined
                          ? index === activeImage
                            ? "100%"
                            : "33%"
                          : "33%",
                      height: isActive ? 600 : 200,
                      x:
                        index === activeImage
                          ? 0
                          : ((index % 3) * (imageContainerWidth ?? 0)) / 3,
                      y:
                        index === activeImage
                          ? 0
                          : Math.floor(index / 3) * (200 + 8),
                      pointerEvents,
                      opacity:
                        activeImage != undefined ? (isActive ? 1 : 0) : 1,
                      scale:
                        activeImage != undefined ? (isActive ? 1 : 0.9) : 1,
                    }}
                    transition={{
                      bounce: 0.15,
                      // duration: 0.35,
                      visualDuration: 0.34,
                      type: "spring",
                    }}
                    // layout
                  >
                    {type === "image" ? (
                      <div className="w-full h-full overflow-hidden">
                        <img
                          className={`w-full h-full object-contain ${!isActive && nsfwLevel > 2 ? "blur-lg" : ""}`}
                          src={
                            index === activeImage
                              ? url.replace(/width=\d+\//gi, "")
                              : url
                          }
                          onClick={() => {
                            setActiveImage((prev) =>
                              index !== prev ? index : undefined
                            );
                          }}
                        />
                        {/* {index === 0 && (
                        <BlurHashCanvas
                          width={280}
                          height={200}
                          hash={hash}
                          onClick={() => {
                            setActiveImage((prev) =>
                              index !== prev ? index : undefined
                            );
                          }}
                          className="absolute top-0 left-0"
                        />
                      )} */}
                      </div>
                    ) : (
                      <video
                        className="w-full h-full object-contain"
                        src={url}
                        autoPlay
                        loop
                        muted
                        onClick={() => {
                          setActiveImage((prev) =>
                            index !== prev ? index : undefined
                          );
                        }}
                      />
                    )}
                    {isActive && (
                      <motion.div className="flex absolute top-0 h-full w-full justify-between pointer-events-none place-items-center p-7">
                        {processedImages.length > 1 && (
                          <Button
                            onClick={() =>
                              setActiveImage((prev) =>
                                activeImage > 0
                                  ? prev - 1
                                  : processedImages?.length - 1
                              )
                            }
                            variant="clear"
                            // disabled={activeImage === 0}
                            className="pointer-events-auto border-none size-12 rounded-full enabled:hover:bg-white-950/30! enabled:bg-white! backdrop-blur-none text-neutral-950 hover:text-neutral-950 hover:opacity-80 opacity-50 transition-all p-0!"
                          >
                            <ChevronLeftIcon />
                          </Button>
                        )}
                        {processedImages.length > 1 && (
                          <Button
                            onClick={() =>
                              setActiveImage((prev) =>
                                activeImage < processedImages.length - 1
                                  ? prev + 1
                                  : 0
                              )
                            }
                            variant="clear"
                            // disabled={activeImage >= processedImages.length - 1}
                            className="pointer-events-auto border-none size-12 rounded-full enabled:hover:bg-white-950/30! enabled:bg-white! backdrop-blur-none text-neutral-950 hover:text-neutral-950 hover:opacity-80 opacity-50 transition-all p-0!"
                          >
                            <ChevronRightIcon />
                          </Button>
                        )}
                      </motion.div>
                    )}
                    {isActive && meta?.prompt && (
                      <div className="px-2 py-4 text-left flex-col items-start flex place-items-center gap-1">
                        <label className="font-bold">Prompt:</label>
                        <div className="flex place-items-center gap-3">
                          <p className="cursor-auto select-text">
                            {meta?.prompt}
                          </p>
                          <Button
                            onClick={() => {
                              navigator.clipboard.writeText(meta.prompt);
                            }}
                          >
                            <CopyIcon />
                          </Button>
                        </div>
                      </div>
                    )}
                    {isActive && meta?.negativePrompt && (
                      <div className="px-2 py-4 text-left flex-col items-start flex place-items-center gap-1">
                        <label className="font-bold">Negative Prompt:</label>
                        <div className="flex place-items-center gap-3">
                          <p className="cursor-auto select-text">
                            {meta?.negativePrompt}
                          </p>
                          <Button
                            onClick={() => {
                              navigator.clipboard.writeText(
                                meta.negativePrompt
                              );
                            }}
                          >
                            <CopyIcon />
                          </Button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default LoraDetails;
