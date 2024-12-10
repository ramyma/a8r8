import Slider from "../../components/Slider";
import Button from "../../components/Button";
import { LoraState, removeLora, updateLora } from "../../state/lorasSlice";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { selectSelectedModel } from "../../state/optionsSlice";
import { emitCustomEvent } from "react-custom-events";
import Checkbox from "../../components/Checkbox";
import { TrashIcon } from "@radix-ui/react-icons";
import { Lora } from "../../App.d";

type Props = { lora: Omit<Partial<Lora>, "path"> & LoraState; index: number };

const LorasSectionItem = ({ lora, index }: Props) => {
  const model = useAppSelector(selectSelectedModel);
  const dispatch = useAppDispatch();

  const isFlux =
    (lora.stored_metadata?.baseModel || lora.name)
      ?.toLowerCase()
      .includes("flux") ||
    lora.metadata?.ss_sd_model_name?.toLowerCase().includes("flux") ||
    lora.metadata?.baseModel?.toLowerCase().includes("flux");
  const isSd35 =
    (lora.stored_metadata?.baseModel || lora.name)
      ?.toLowerCase()
      .includes("3.5") ||
    lora.metadata?.ss_sd_model_name?.toLowerCase().includes("3.5") ||
    lora.metadata?.baseModel?.toLowerCase().includes("3.5");
  const isSdxl =
    (lora.stored_metadata?.baseModel || lora.name)
      ?.toLowerCase()
      .includes("xl") ||
    lora.metadata?.ss_sd_model_name?.toLowerCase().includes("xl") ||
    lora.metadata?.baseModel?.toLowerCase().includes("xl");
  const isPony =
    (lora.stored_metadata?.baseModel || lora.name)
      ?.toLowerCase()
      .includes("pony") ||
    lora.metadata?.ss_sd_model_name?.toLowerCase().includes("pony") ||
    lora.metadata?.baseModel?.toLowerCase().includes("pony");

  const isSd =
    (lora.stored_metadata?.baseModel || lora.name)
      ?.toLowerCase()
      .includes("1.5") ||
    lora.metadata?.ss_sd_model_name?.toLowerCase().includes("1.5") ||
    lora.metadata?.baseModel?.toLowerCase().includes("1.5");
  const handleTitleClick = (lora: Props["lora"]) => {
    emitCustomEvent("setActiveLora", lora);
    emitCustomEvent("showLorasModal");
  };
  const isInCompatible =
    !(model.isFlux && isFlux) &&
    !(model.isSd35 && isSd35) &&
    !(model.isPony && (isPony || isSdxl)) &&
    !(model.isSdXl && isSdxl);

  const isDisabled = !lora.isEnabled;

  const handleUpdateLora = (index: number, lora: Partial<LoraState>) => {
    dispatch(updateLora({ index, lora }));
  };

  const handleToggleTriggerWord = (index, word) => {
    const triggerWordIndex =
      lora.triggerWords?.findIndex((value) => value === word) ?? -1;

    let updatedTriggerWords;

    if (lora.triggerWords && triggerWordIndex > -1) {
      updatedTriggerWords = lora.triggerWords.filter((value) => value !== word);
    } else {
      updatedTriggerWords = [...(lora.triggerWords ?? []), word];
    }
    handleUpdateLora(index, { triggerWords: updatedTriggerWords });
  };

  const firstImage = lora?.stored_metadata?.images?.[0];

  return (
    <div className="group flex flex-col gap-3 aria-disabled:text-neutral-500 border-b last:border-none py-6 border-neutral-800 text-sm">
      <div
        className={`flex gap-5 place-items-start justify-between ${isDisabled ? "text-neutral-400" : ""} `}
      >
        <div
          className={`flex gap-2 place-items-start ${isDisabled ? "grayscale" : ""}`}
        >
          {firstImage && (
            <div className="flex size-9 flex-grow flex-shrink-0 rounded overflow-hidden bg-black/70">
              <div
                className={`flex flex-1 ${firstImage?.nsfwLevel > 2 ? "blur-lg" : ""}`}
              >
                {firstImage?.type === "image" ? (
                  <div
                    className="flex-1 bg-cover"
                    style={{
                      backgroundImage: `url(${firstImage?.url})`,
                    }}
                  />
                ) : (
                  <video
                    className="object-contain size-full"
                    src={lora?.stored_metadata?.images[0].url}
                    autoPlay
                    loop
                    muted
                  />
                )}
              </div>
            </div>
          )}
          <div
            className={`cursor-pointer select-none ${isInCompatible ? "text-warning" : ""}`}
            onClick={() => handleTitleClick(lora)}
          >
            {lora.alias || lora.name}
          </div>
        </div>
        <Checkbox
          name="isEnabled"
          className="cursor-auto"
          value={lora.isEnabled}
          onChange={(value) => handleUpdateLora(index, { isEnabled: value })}
        />
      </div>
      <div
        className="group flex w-full flex-col gap-3 aria-disabled:text-neutral-400 select-none"
        aria-disabled={isDisabled}
      >
        <div className="inline-flex gap-2 flex-wrap">
          {lora?.stored_metadata?.trainedWords.map((word, wordIndex) => (
            <div
              key={(word ?? "") + wordIndex}
              className={`border border-neutral-700 p-2 rounded size-fit max-h-10 max-w-32 overflow-hidden text-ellipsis text-nowrap group-aria-[disabled=false]:cursor-pointer ${lora.triggerWords?.includes(word) ? "group-aria-[disabled=false]:border-primary group-disabled:border-neutral-800 group-aria-[disabled=false]:bg-neutral-800 bg-neutral-800" : "group-aria-disabled:border-neutral-800"} transition-colors select-none`}
              title={word}
              onClick={() =>
                !isDisabled && handleToggleTriggerWord(index, word)
              }
            >
              {word}
            </div>
          ))}
        </div>
        <div className="flex justify-between gap-5">
          <Slider
            className="flex-1"
            label="Strength"
            name="strength"
            defaultValue={1}
            min={0}
            max={2}
            step={0.001}
            value={lora.strength}
            disabled={isDisabled}
            onChange={(value) => handleUpdateLora(index, { strength: value })}
          />
          <Button
            type="button"
            title="Remove"
            onClick={() => dispatch(removeLora(index))}
          >
            <TrashIcon />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LorasSectionItem;
