import { EditorState } from "remirror";
import { REGIONAL_PROMPTS_SEPARATOR } from "./constants";
import { MainFormValues } from "./MainForm";
import { editorJsonToText } from "../utils";
import { selectPromptRegionLayers } from "../state/promptRegionsSlice";
import { Lora } from "../App.d";
import { LoraState } from "../state/lorasSlice";
import { Backend } from "../state/optionsSlice";
import escapeRegExp from "escape-string-regexp";
/**
 * Extracts prompt text from base and enabled regional prompts
 */
export const processPrompt = ({
  prompt,
  regionalPrompts,
  isRegionalPromptingEnabled,
  promptRegions,
  loras,
  lorasState,
  backend,
}: {
  prompt: MainFormValues["prompt"];
  regionalPrompts: MainFormValues["regionalPrompts"];
  isRegionalPromptingEnabled: boolean;
  promptRegions: ReturnType<typeof selectPromptRegionLayers>;
  loras: Lora[];
  lorasState: LoraState[];
  backend: Backend;
}) => {
  const basePrompt =
    ((typeof prompt === "string"
      ? prompt
      : editorJsonToText((prompt as EditorState).doc.toJSON())) ?? "") +
    " " +
    lorasToPrompt(lorasState, loras, backend);

  if (!isRegionalPromptingEnabled || !regionalPrompts)
    return { basePrompt, processedPrompt: basePrompt };

  const [regionalPromptsValues, regionalPromptsWeights, regionalPromptsIds] =
    promptRegions.reduce(
      (acc, { id = "", isEnabled }) => {
        if (isEnabled) {
          return [
            [
              ...acc[0],
              editorJsonToText(
                (regionalPrompts[id].prompt as EditorState).doc.toJSON()
              ),
            ],
            [...acc[1], regionalPrompts[id].weight],
            [...acc[2], id],
          ];
        }
        return acc;
      },
      [[], [], []] as [string[], number[], string[]]
    );

  return {
    basePrompt,
    processedPrompt: `${basePrompt} ${REGIONAL_PROMPTS_SEPARATOR} ${regionalPromptsValues.join(REGIONAL_PROMPTS_SEPARATOR)}`,
    regionalPromptsWeights,
    regionalPromptsValues,
    regionalPromptsIds,
  };
};

const lorasToPrompt = (
  lorasState: LoraState[] = [],
  loras: Lora[],
  backend: Backend
): string => {
  const lorasWithState =
    lorasState?.map(({ path, ...loraState }) => {
      const lora = loras?.find((lora) => lora.path === path);
      return { path, ...loraState, ...lora };
    }) ?? [];
  return lorasWithState
    .filter(({ isEnabled }) => isEnabled)
    .map(({ path, name, strength, triggerWords }) => {
      const joinedTriggerWords = triggerWords?.join(", ") ?? "";
      return `<lora:${backend === "comfy" ? path.replace(new RegExp(String.raw`(?<=${escapeRegExp(name)}).*`), "") : name}:${strength}> ${joinedTriggerWords}`.trim();
    })
    .join(" ");
};
