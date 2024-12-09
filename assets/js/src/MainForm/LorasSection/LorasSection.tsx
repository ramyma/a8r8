import { useAppSelector } from "../../hooks";
import { selectLoras } from "../../state/lorasSlice";
import Label from "../../components/Label";
import ScrollArea from "../../components/ScrollArea";
import LorasSectionItem from "./LorasSectionItem";
import Button from "../../components/Button";
import { PlusIcon } from "@radix-ui/react-icons";
import { emitCustomEvent } from "react-custom-events";
import Link from "../../components/Link";
import useLoras from "../../hooks/useLoras";

const LorasSection = () => {
  const { loras } = useLoras();
  const lorasState = useAppSelector(selectLoras);
  const lorasWithState =
    lorasState?.map(({ path, ...loraState }) => {
      const lora = loras?.find((lora) => lora.path === path);
      return { path, ...loraState, ...lora };
    }) ?? [];

  const showLorasModal = () => {
    emitCustomEvent("setActiveLora");
    emitCustomEvent("showLorasModal");
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex place-items-center justify-between">
        <Label>Loras</Label>
        <Button onClick={showLorasModal}>
          <PlusIcon />
        </Button>
      </div>
      <ScrollArea className="bg-neutral-900/80 min-h-14 rounded border border-neutral-800/70 ">
        <div className="flex gap-3 flex-col px-5">
          <div className="max-h-[26rem]">
            {!lorasWithState?.length && (
              <div className="text-sm pt-4">
                <Link onClick={showLorasModal}>Add Lora</Link>
              </div>
            )}
            {lorasWithState?.map((lora, index) => (
              <LorasSectionItem
                key={(lora.path ?? "") + index}
                lora={lora}
                index={index}
              />
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default LorasSection;
