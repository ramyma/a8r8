import { Vector2d } from "konva/lib/types";
import Konva from "konva";
import { Layer as LayerType } from "konva/lib/Layer";
import {
  ControlnetLayer,
  updateControlnetLayer,
} from "./state/controlnetSlice";
import { RemirrorJSON } from "remirror";
import { Group } from "konva/lib/Group";
import { layersSlice } from "./state/layersSlice";

export type PngInfo = {
  prompt: string;
  negativePrompt: string;
  sampler: string;
  seed: number | string;
  denoising_strength: number | string;
  steps: number | string;
};

const parseControlnetPreprocessorParams = (
  params: string
): Partial<ControlnetLayer> => {
  const [[processorRes], [thresholdA], [thresholdB]] = Array.from(
    params.matchAll(/\d+/g) ?? []
  );
  return {
    processor_res: +processorRes,
    threshold_a: +thresholdA,
    threshold_b: +thresholdB,
  };
};
export const extractPngInfo = (data: { info: string }): PngInfo | undefined => {
  if (data?.info) {
    const {
      prompt = "",
      negativePrompt = "",
      info = "",
    } = /^((?<prompt>.*)\n)?(negative prompt: (?<negativePrompt>.*)\n)?(?<info>.*)$/gi.exec(
      data.info
    )?.groups ?? {};

    const paramsSplit = info.match(
      /(?<=\s|^)(((\w|\s)+: (("(\w|\.|\s|\[|\]|\(|\)|,)+")|(\w|\.|\s|\[|\]|\+)+))|controlnet \d+: "[\w\d_\s(),/:.[\]+-]+")(?=,\s)?/gi
    );

    const params: any =
      paramsSplit?.reduce((acc, paramLine) => {
        const [, key, value] = Array.from(
          /([\w\s\d]+): ("?.+"?)/.exec(paramLine) ?? []
        ); //.split(": ");
        if (key.trim().toLocaleLowerCase() === "size") {
          const [width, height] = value.split("x");
          return {
            ...acc,
            width,
            height,
          };
        }

        return {
          ...acc,
          [key.toLowerCase().trim().replaceAll(" ", "_")]: value.trim(),
        };
      }, {}) ?? {};

    const pngInfo = { prompt, negativePrompt, ...params };

    return pngInfo;
  }
};

const parseControlnetValue = (value) => {
  const parsedValue: string | boolean | number = value;

  /**
   * Parse value
   */
  if (
    typeof parsedValue === "string" &&
    ["True", "False"].includes(parsedValue)
  ) {
    // parse boolean values
    return parsedValue === "True";
  }
  if (typeof parsedValue === "string" && !isNaN(parseFloat(parsedValue))) {
    // parse number values
    return parseFloat(parsedValue);
  }
  return parsedValue;
};

/**
 * Extract controlnet arguments from png info object
 * @param pngInfo
 */
export const extractControlnetArgs = (pngInfo: PngInfo): ControlnetLayer[] => {
  const layersObj = Object.entries(pngInfo).reduce(
    (layersAcc: { [key: string]: ControlnetLayer }, item) => {
      const [key, value] = item;
      if (key?.match(/^controlnet?(_\d)+$/)) {
        const [layerId] = key.match(/\d/g) ?? [];

        const paramsSplit = (value as string).match(
          /(?<=\s|^")((\w|\s|\/)+: ((\((\d|\.|\s|,)+\))|(\w|\.|\s|\[|\]|\+|_)+))(?=,\s)?/g
        );
        paramsSplit?.forEach((paramLine) => {
          let layer = {};

          const [, key, value] = Array.from(
            /([\w\s\d/]+): ("?.+"?)/.exec(paramLine) ?? []
          );

          switch (key.trim().toLocaleLowerCase()) {
            case "preprocessor": {
              layer = {
                ...layer,
                module: value,
              };
              break;
            }

            case "control mode": {
              layer = {
                ...layer,
                control_mode:
                  value == "Balanced"
                    ? 0
                    : value == "My prompt is more important"
                    ? 1
                    : value == "ControlNet is more important"
                    ? 2
                    : parseControlnetValue(value),
              };
              break;
            }

            case "preprocessor params": {
              const [processor_res, threshold_a, threshold_b] = Array.from(
                value.match(/(\d+(\.\d+)?)/g) ?? []
              );

              layer = {
                ...layer,
                processor_res: parseControlnetValue(processor_res),
                threshold_a: parseControlnetValue(threshold_a),
                threshold_b: parseControlnetValue(threshold_b),
              };
              break;
            }
            case "starting/ending": {
              const [guidance_start, guidance_end] = Array.from(
                value.match(/(\d+(\.\d+)?)/g) ?? []
              );

              layer = {
                ...layer,
                guidance_start: parseControlnetValue(guidance_start),
                guidance_end: parseControlnetValue(guidance_end),
              };
              break;
            }

            default: {
              layer = {
                ...layer,
                [key.toLowerCase().trim().replaceAll(" ", "_")]:
                  parseControlnetValue(value.trim()),
              };
              break;
            }
          }

          layersAcc = {
            ...layersAcc,
            [layerId as string]: {
              ...layersAcc[layerId as string],
              ...layer,

              id: layerId,
              isEnabled: true,
            },
          };
        }, {}) ?? {};
      }
      /**
       * Old controlnet meta tags format
       */
      if (key?.match(/^controlnet?_\d+_/)) {
        const [, id, argKey] = Array.from(
          /(?<=controlnet_)(\d+)_(.*)$/g.exec(key) ?? []
        );

        let layer: ControlnetLayer = layersAcc[id] ?? { id };
        const parsedValue = parseControlnetValue(value);

        /**
         * Assign args
         */

        switch (argKey) {
          case "enabled":
            layer = {
              ...layer,
              isEnabled: parsedValue as boolean,
            };
            break;
          case "preprocessor":
            layer = {
              ...layer,
              module: parsedValue as ControlnetLayer["module"],
            };
            break;
          case "starting_step":
            layer = {
              ...layer,
              guidance_start: parsedValue as ControlnetLayer["guidance_start"],
            };
            break;
          case "ending_step":
            layer = {
              ...layer,
              guidance_end: parsedValue as ControlnetLayer["guidance_start"],
            };
            break;
          case "preprocessor_parameters":
            layer = {
              ...layer,
              ...parseControlnetPreprocessorParams(parsedValue as string),
            };
            break;
          default:
            layer = { ...layer, [argKey]: parsedValue };
            break;
        }

        return { ...layersAcc, [id]: layer };
      }

      return layersAcc;
    },
    {}
  );

  return Object.values(layersObj);
};

/**
 * Convert hex color code to rgb format
 * @param hex
 * @returns
 */
export const hexToRgb = (hex: string) => {
  // Convert hex to RGB string
  const r = parseInt(hex.substring(1, 3), 16);
  const g = parseInt(hex.substring(3, 5), 16);
  const b = parseInt(hex.substring(5, 7), 16);
  const a = parseInt(hex.substring(7), 16) / 255;

  // Return RGB string
  return `rgb(${r}, ${g}, ${b}${a ? `, ${a.toFixed(2)}` : ""})`;
};

export const scalePoint = (
  point: Vector2d,
  scale: Vector2d,
  stagePosition: Vector2d
): Vector2d => {
  return {
    x: scalePointComponent(point.x, scale.x, stagePosition.x),
    y: scalePointComponent(point.y, scale.y, stagePosition.y),
  };
};

export const scalePointComponent = (
  component: number,
  scale: number,
  stagePosition: number
): number => {
  return component / scale - stagePosition / scale;
};

export const updateControlnetArgs = (
  pngInfo: PngInfo | undefined,
  dispatch
) => {
  const controlnetArgs = (pngInfo && extractControlnetArgs(pngInfo)) ?? [];
  //TODO: dispatch a single action for updating all layers
  controlnetArgs.forEach((args) =>
    dispatch(updateControlnetLayer({ layerId: args?.id, ...args }))
  );
};

export const roundToClosestMultipleOf8 = (number: number): number => {
  const upperRound = roundToClosestMultipleOf8Up(number);
  const lowerRound = roundToClosestMultipleOf8Down(number);
  let roundedNumber;
  if (Math.abs(upperRound - number) < Math.abs(lowerRound - number)) {
    roundedNumber = upperRound;
  } else {
    roundedNumber = lowerRound;
  }
  return Math.max(roundedNumber, 8);
};

export const roundToClosestMultipleOf8Up = (number: number): number => {
  return Math.round((number + 4) / 8) * 8;
};

export const roundToClosestMultipleOf8Down = (number: number): number => {
  return Math.round((number - 4) / 8) * 8;
};

export const getLayers = async ({
  refs,
  isMaskLayerVisible,
  controlnetLayersArgs,
}: {
  refs: any;
  isMaskLayerVisible: boolean;
  controlnetLayersArgs?: ControlnetLayer[];
}): Promise<{
  maskDataUrl: string;
  initImageDataUrl: string | undefined;
  controlnetDataUrls: string[];
}> => {
  const {
    stageRef,
    maskLayerRef,
    controlnetLayerRef,
    selectionBoxRef,
    selectionBoxLayerRef,
    overlayLayerRef,
    imageLayerRef,
    maskCompositeRectRef,
  } = refs;
  // if (layer.width() !== 0 && layer.height() !== 0) {
  const stage = stageRef?.current;
  const maskLayer = maskLayerRef?.current;
  const controlnetLayer = controlnetLayerRef?.current;

  const selectionBox = selectionBoxRef?.current;
  const selectionBoxLayer = selectionBoxLayerRef?.current;
  const overlayLayer = overlayLayerRef?.current;
  const imageLayer = imageLayerRef?.current;
  maskCompositeRectRef?.current.visible(false);
  // maskLayer?.visible(isMaskLayerVisible);

  const tempLayer: LayerType | undefined = maskLayer?.clone();
  tempLayer?.scale(maskLayer?.getAbsoluteScale());
  tempLayer?.position(maskLayer?.getAbsolutePosition() ?? { x: 0, y: 0 });
  tempLayer?.cache();
  // tempLayer.filters([Konva.Threshold, Konva.Filters.Invert]);
  tempLayer?.filters([Konva.Filters.RGB, Konva.Filters.Invert]);

  // const config = {
  //   x: selectionBox.getAbsolutePosition().x, //stagContainer.clientWidth / 2 - 512 / 2,
  //   y: selectionBox.getAbsolutePosition().y,
  //   width:
  //     selectionBox.width() * selectionBox.scaleX() * (stage?.scaleX() ?? 1),
  //   height:
  //     selectionBox.height() * selectionBox.scaleY() * (stage?.scaleX() ?? 1),
  //   imageSmoothingEnabled: true,
  //   pixelRatio: 1 / (stage?.scaleX() ?? 1),
  // };
  // console.log(
  //   "POS",
  //   config.width,
  //   config.height,
  //   config.width * config.pixelRatio,
  //   config.height * config.pixelRatio
  // );

  // document.getElementById("maskIn").value = await tempLayer.toDataURL({
  //   x: selectionBoxTransformer.getAbsolutePosition().x, //stagContainer.clientWidth / 2 - 512 / 2,
  //   y: selectionBoxTransformer.getAbsolutePosition().y,
  //   width: selectionBox.width() * selectionBox.scaleX() * stage.scaleX(),
  //   height: selectionBox.height() * selectionBox.scaleY() * stage.scaleX(),
  //   imageSmoothingEnabled: false,
  //   pixelRatio: 1 / stage.scaleX(),
  // });
  const oldStageScale = stage?.scale();
  stage?.scale({ x: 1, y: 1 });
  tempLayer?.scale({ x: 1, y: 1 });

  const maskDataUrl =
    (await tempLayer?.toDataURL({
      x: selectionBox?.getAbsolutePosition().x, //stagContainer.clientWidth / 2 - 512 / 2,
      y: selectionBox?.getAbsolutePosition().y,
      width: selectionBox?.width(),
      height: selectionBox?.height(),
      // imageSmoothingEnabled: false,
      // pixelRatio: 1 / stage.scaleX(),
    })) ?? "";
  maskCompositeRectRef?.current.visible(true);

  // } else {
  //   document.getElementById("maskIn").value = "";
  // }
  // tempLayer.destroy();
  selectionBoxLayer?.visible(false);
  overlayLayer?.visible(false);
  controlnetLayer?.visible(false);
  maskLayer?.visible(false);
  const initImageDataUrl = await stage?.toDataURL({
    x: selectionBox?.getAbsolutePosition().x, //stagContainer.clientWidth / 2 - 512 / 2,
    y: selectionBox?.getAbsolutePosition().y,
    width: selectionBox?.width(),
    height: selectionBox?.height(),
    // imageSmoothingEnabled: false,
  });
  selectionBoxLayer?.visible(true);
  overlayLayer?.visible(true);

  controlnetLayer?.visible(true);

  maskLayer?.visible(isMaskLayerVisible);
  const bgRect = new Konva.Rect({
    x: selectionBox?.getPosition().x,
    y: selectionBox?.getPosition().y,
    width: selectionBox?.width(),
    height: selectionBox?.height(),
    fill: "white",
    globalCompositeOperation: "source-over",
  });
  controlnetLayer?.add(bgRect);
  bgRect.moveToBottom();

  const controlnetLayerGroups = controlnetLayer?.children?.slice(1);

  const initialGroupsVisibility: boolean[] = controlnetLayerGroups.map(
    (group) => {
      const initialGroupVisibility = group.isVisible();
      group.visible(false);
      return initialGroupVisibility;
    }
  );

  const controlnetDataUrls =
    controlnetLayersArgs &&
    controlnetLayersArgs.map((layer, index) => {
      if (!layer.isEnabled) return "";
      const layerGroup: Group = controlnetLayerGroups[index];
      layerGroup.visible(true);
      const controlnetDataUrl = layer.overrideBaseLayer
        ? controlnetLayer.toDataURL({
            x: selectionBox?.getAbsolutePosition().x, //stagContainer.clientWidth / 2 - 512 / 2,
            y: selectionBox?.getAbsolutePosition().y,
            width: selectionBox?.width(),
            height: selectionBox?.height(),
            // imageSmoothingEnabled: false,
          })
        : "";
      layerGroup.visible(false);
      return controlnetDataUrl;
    });

  controlnetLayerGroups?.forEach((group, index) =>
    group.visible(initialGroupsVisibility[index])
  );

  bgRect.destroy();
  // controlnetLayer?.visible(false);
  stage?.scale(oldStageScale);
  // document.getElementById("initIn").value = await imageLayer.toDataURL({
  //   x: selectionBoxTransformer.getAbsolutePosition().x, //stagContainer.clientWidth / 2 - 512 / 2,
  //   y: selectionBoxTransformer.getAbsolutePosition().y,
  //   width: selectionBox.width() * selectionBox.scaleX() * stage.scaleX(),
  //   height: selectionBox.height() * selectionBox.scaleY() * stage.scaleX(),
  //   pixelRatio: 1 / stage.scaleX(),
  // });
  // e.stopPropagation();
  // img = document.createElement("img");
  // img.src = `${await stage.toDataURL({
  //   x: 0,
  //   y: 0,
  //   width: 512,
  //   height: 512,
  // })}`;
  // document.body.append(img);

  return { maskDataUrl, initImageDataUrl, controlnetDataUrls };
};

/**
 * Converts Remirror editor json to plain text
 * @param json
 * @returns
 */
export const editorJsonToText = (json: RemirrorJSON) => {
  if (json) {
    const text = json?.content?.reduce((acc, nodeJson, index) => {
      const nodeContent = nodeJson.content ?? [];
      const nodesText =
        nodeContent?.reduce((acc, nodeJson) => {
          switch (nodeJson.type) {
            case "text":
              return acc + (nodeJson.text ?? "");

            case "extra":
              return (
                acc + `<lora:${nodeJson.attrs?.code}:${nodeJson.attrs?.value}>`
              );
            case "attention":
              return acc + `(${nodeJson.attrs?.code}:${nodeJson.attrs?.value})`;
            default:
              return acc + "";
          }
        }, "") || "";
      return (
        acc +
        nodesText +
        (index < ((json?.content as RemirrorJSON[]).length - 1 ?? 0)
          ? "\n"
          : "")
      );
    }, "");

    return text?.trim() ?? "";
  }
  return "";
};

/**
 * Removes trailing zeros after applying toFixed to the provided `number`
 *
 * @param number
 * @param maxDecimalPlaces maximum decimal places to return
 * @returns
 */
export const formatToMaxDecimalPlaces = (
  number: number,
  maxDecimalPlaces: number
): number => {
  if (typeof number === "number" && !Number.isInteger(number)) {
    const remainder = number % 1;
    if (remainder === 0) return Math.floor(number);
    else {
      const unsigned: number = parseFloat(
        (
          Math.abs(parseInt("" + number)) +
          Math.abs(
            Math.round(remainder * 10 ** maxDecimalPlaces) /
              Math.round(10 ** maxDecimalPlaces)
          )
        ).toFixed(maxDecimalPlaces)
      );

      return unsigned * (number < 0 ? -1 : 1);
    }
  }
  return number;
};

const IGNORE_TIME = 250;

let filter = true;
export default function undoFilter(action, currState, prevState) {
  // other filters
  const filter1 = action.type.startsWith(`${layersSlice.name}/`);
  filter = actionsThrottlingFilter(action);
  return filter || filter1;
}

// Store rapid actions of the same type at most once every x time.
let ignoreRapid = false;
let prevActionType;
function actionsThrottlingFilter(action) {
  if (action.type !== prevActionType) {
    ignoreRapid = false;
    prevActionType = action.type;
    return true;
  }
  if (ignoreRapid) {
    return false;
  }
  ignoreRapid = true;
  setTimeout(() => {
    ignoreRapid = false;
  }, IGNORE_TIME);
  return true;
}
