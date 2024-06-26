import { test } from "vitest";
import { ControlnetLayer } from "./state/controlnetSlice";
import {
  editorJsonToText,
  extractControlnetArgs,
  extractPngInfo,
  formatToMaxDecimalPlaces,
} from "./utils";
import "@testing-library/jest-dom";

describe("pngInfo tests", () => {
  const prompt = "prompt line";
  const negativePrompt = "negative prompt line";

  const infoString = `${prompt}\nNegative prompt: ${negativePrompt}\nSteps: 20, Sampler: DPM++ 2M Karras Test, CFG scale: 7.0, Seed: 123, Size: 512x768, Model hash: e6415c4892, Denoising strength: 0.75, ControlNet 0 Enabled: True, ControlNet 0 Preprocessor: lineart, ControlNet 0 Model: control_v11p_sd15_lineart [43d4be0d], ControlNet 0 Weight: 1.0, ControlNet 0 Starting Step: 0.0, ControlNet 0 Ending Step: 1.0, ControlNet 0 Resize Mode: Just Resize, ControlNet 0 Pixel Perfect: True, ControlNet 0 Control Mode: 0, ControlNet 0 Preprocessor Parameters: "(512, 64, 64)", ControlNet 1 Enabled: True, ControlNet 1 Preprocessor: openpose_full, ControlNet 1 Model: control_v11p_sd15_openpose [cab727d4], ControlNet 1 Weight: 1.0, ControlNet 1 Starting Step: 0.0, ControlNet 1 Ending Step: 1.0, ControlNet 1 Resize Mode: Just Resize, ControlNet 1 Pixel Perfect: True, ControlNet 1 Control Mode: 0, ControlNet 1 Preprocessor Parameters: "(512, 64, 64)", Discard penultimate sigma: True`;

  const updatedControlnetInfoStringV1_1_142 = `${prompt}\nNegative prompt: ${negativePrompt}\nSteps: 20, Sampler: DPM++ 2M Karras Test, CFG scale: 7.0, Seed: 123, Size: 512x768, Model hash: e6415c4892, Denoising strength: 0.75, Version: v1.2.1, ControlNet 0: "preprocessor: reference_adain+attn, model: None, weight: 1, starting/ending: (0, 1), resize mode: Crop and Resize, pixel perfect: True, control mode: Balanced, preprocessor params: (512, 0.5, 64)", ControlNet 1: "preprocessor: reference_adain+attn, model: None, weight: 1, starting/ending: (0, 1), resize mode: Crop and Resize, pixel perfect: True, control mode: Balanced, preprocessor params: (64, 0.5, 64)", Discard penultimate sigma: True`;

  const data = {
    info: infoString,
  };
  const pngInfo = {
    prompt,
    negativePrompt,
    steps: "20",
    sampler: "DPM++ 2M Karras Test",
    cfg_scale: "7.0",
    seed: "123",
    width: "512",
    height: "768",
    model_hash: "e6415c4892",
    denoising_strength: "0.75",
    controlnet_0_enabled: "True",
    controlnet_0_preprocessor: "lineart",
    controlnet_0_model: "control_v11p_sd15_lineart [43d4be0d]",
    controlnet_0_weight: "1.0",
    controlnet_0_starting_step: "0.0",
    controlnet_0_ending_step: "1.0",
    controlnet_0_resize_mode: "Just Resize",
    controlnet_0_pixel_perfect: "True",
    controlnet_0_control_mode: "0",
    controlnet_0_preprocessor_parameters: '"(512, 64, 64)"',
    controlnet_1_enabled: "True",
    controlnet_1_preprocessor: "openpose_full",
    controlnet_1_model: "control_v11p_sd15_openpose [cab727d4]",
    controlnet_1_weight: "1.0",
    controlnet_1_starting_step: "0.0",
    controlnet_1_ending_step: "1.0",
    controlnet_1_resize_mode: "Just Resize",
    controlnet_1_preprocessor_parameters: '"(512, 64, 64)"',
    controlnet_1_pixel_perfect: "True",
    controlnet_1_control_mode: "0",
    discard_penultimate_sigma: "True",
  };

  const updatedPngInfo = {
    prompt,
    negativePrompt,
    steps: "20",
    sampler: "DPM++ 2M Karras Test",
    cfg_scale: "7.0",
    seed: "123",
    width: "512",
    height: "768",
    model_hash: "e6415c4892",
    denoising_strength: "0.75",
    controlnet_0:
      '"preprocessor: reference_adain+attn, model: None, weight: 1, starting/ending: (0, 1), resize mode: Crop and Resize, pixel perfect: True, control mode: Balanced, preprocessor params: (512, 0.5, 64)"',
    controlnet_1:
      '"preprocessor: reference_adain+attn, model: None, weight: 1, starting/ending: (0, 1), resize mode: Crop and Resize, pixel perfect: True, control mode: Balanced, preprocessor params: (64, 0.5, 64)"',
  };

  test("should extract png info correctly", () => {
    const result = extractPngInfo(data);

    expect(result).toContain(pngInfo);
  });
  test("should extract png info correctly when prompt or negative prompt are empty", () => {
    const result = extractPngInfo({
      info: "Negative prompt: negative prompt line\nSteps: 20, Sampler: DPM++ 2M Karras Test, CFG scale: 7.0, Seed: 123, Size: 512x768, Model hash: e6415c4892, Denoising strength: 0.75",
    });
    expect(result).not.toThrowError;

    const result2 = extractPngInfo({
      info: "prompt line\nSteps: 20, Sampler: DPM++ 2M Karras Test, CFG scale: 7.0, Seed: 123, Size: 512x768, Model hash: e6415c4892, Denoising strength: 0.75",
    });
    expect(result2).not.toThrowError;

    const result3 = extractPngInfo({
      info: "Steps: 20, Sampler: DPM++ 2M Karras Test, CFG scale: 7.0, Seed: 123, Size: 512x768, Model hash: e6415c4892, Denoising strength: 0.75",
    });
    expect(result3).not.toThrowError;
  });
  test("should extract png info correctly for updated v1.1.142 controlnet scheme", () => {
    const result = extractPngInfo({
      info: updatedControlnetInfoStringV1_1_142,
    });
    expect(result).toContain(updatedPngInfo);
  });
  test("should extract controlnet args from png info correctly", () => {
    const result = extractControlnetArgs(pngInfo);
    expect(result).toStrictEqual([
      {
        id: "0",
        isEnabled: true,
        module: "lineart",
        model: "control_v11p_sd15_lineart [43d4be0d]",
        weight: 1,
        guidance_start: 0,
        guidance_end: 1,
        resize_mode: "Just Resize",
        pixel_perfect: true,
        control_mode: "Balanced",
        processor_res: 512,
        threshold_a: 64,
        threshold_b: 64,
      },
      {
        id: "1",
        isEnabled: true,
        module: "openpose_full",
        model: "control_v11p_sd15_openpose [cab727d4]",
        weight: 1,
        guidance_start: 0,
        guidance_end: 1,
        resize_mode: "Just Resize",
        pixel_perfect: true,
        control_mode: "Balanced",
        processor_res: 512,
        threshold_a: 64,
        threshold_b: 64,
      },
    ] as Partial<ControlnetLayer>);

    const result2 = extractControlnetArgs(updatedPngInfo);
    expect(result2).toStrictEqual([
      {
        id: "0",
        isEnabled: true,
        module: "reference_adain+attn",
        model: "None",
        weight: 1,
        guidance_start: 0,
        guidance_end: 1,
        resize_mode: "Crop and Resize",
        pixel_perfect: true,
        control_mode: "Balanced",
        processor_res: 512,
        threshold_a: 0.5,
        threshold_b: 64,
      },
      {
        id: "1",
        isEnabled: true,
        module: "reference_adain+attn",
        model: "None",
        weight: 1,
        guidance_start: 0,
        guidance_end: 1,
        resize_mode: "Crop and Resize",
        pixel_perfect: true,
        control_mode: "Balanced",
        processor_res: 64,
        threshold_a: 0.5,
        threshold_b: 64,
      },
    ] as Partial<ControlnetLayer>);
  });
});

describe("editor jsonToText", () => {
  const json = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "dsdfsd ",
          },
          {
            type: "extra",
            attrs: {
              code: "2dStickersAnimeStyle_v10",
              value: 1,
            },
          },
          {
            type: "text",
            text: " asdfasdf rmadanegative402_sd15-neg  asdfasdf",
          },
        ],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "test new line",
          },
        ],
      },
      {
        type: "paragraph",
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "test new line2 ",
          },
          {
            type: "attention",
            attrs: {
              code: "attenText",
              value: 1.1,
            },
          },
        ],
      },
    ],
  };
  test("should return correct text representation of editor", () => {
    const text = editorJsonToText(json);

    expect(text).toBe(
      "dsdfsd <lora:2dStickersAnimeStyle_v10:1> asdfasdf rmadanegative402_sd15-neg  asdfasdf\ntest new line\n\ntest new line2 (attenText:1.1)"
    );
  });
});

describe("formatToMaxDecimalPlaces", () => {
  test("should return same value if provided number is an integer", () => {
    const inputValue = 1;
    const result = formatToMaxDecimalPlaces(inputValue, 2);
    expect("" + result).toBe("" + inputValue);
  });

  test("should return correct value if provided number has less decimal places than the max allowed", () => {
    let inputValue = 1.82;
    let result = formatToMaxDecimalPlaces(inputValue, 2);
    expect("" + result).toBe("1.82");

    inputValue = -1.1;
    result = formatToMaxDecimalPlaces(inputValue, 2);
    expect("" + result).toBe("-1.1");
  });

  test("should return correct value if provided number has more decimal places than the max allowed", () => {
    let inputValue = 1.103;
    let result = formatToMaxDecimalPlaces(inputValue, 2);
    expect("" + result).toBe("1.1");

    inputValue = 1.11;
    result = formatToMaxDecimalPlaces(inputValue, 2);
    expect("" + result).toBe("1.11");

    inputValue = 1.103;
    result = formatToMaxDecimalPlaces(inputValue, 3);
    expect("" + result).toBe("1.103");
  });
});
