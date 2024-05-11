import { EditorState } from "remirror";
import { REGIONAL_PROMPTS_SEPARATOR } from "./constants";
import { MainFormValues } from "./MainForm";
import { editorJsonToText } from "../utils";
import { selectPromptRegionLayers } from "../state/promptRegionsSlice";

/**
 * Extracts prompt text from base and enabled regional prompts
 */
export const processPrompt = ({
  prompt,
  regionalPrompts,
  isRegionalPromptingEnabled,
  promptRegions,
}: {
  prompt: string;
  regionalPrompts: MainFormValues["regionalPrompts"];
  isRegionalPromptingEnabled: boolean;
  promptRegions: ReturnType<typeof selectPromptRegionLayers>;
}) => {
  const basePrompt =
    (typeof prompt === "string"
      ? prompt
      : editorJsonToText((prompt as EditorState).doc.toJSON())) ?? "";

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
