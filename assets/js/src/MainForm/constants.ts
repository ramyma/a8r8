export const REGIONAL_PROMPTS_SEPARATOR = "<SEP>";

export const weightTypesByName = {
  Normal: () => null,
  Style: (isSdXl: boolean, weight: number) =>
    isSdXl
      ? [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, weight, 0.0, 0.0, 0.0, 0.0]
      : [
          weight,
          weight,
          weight,
          weight,
          weight,
          weight,
          weight,
          weight,
          weight,
          weight,
          weight,
          weight,
          weight,
          weight,
          weight,
          weight,
        ],
  "Strong Style": (isSdXl: boolean, weight: number) =>
    isSdXl
      ? [
          weight,
          weight,
          weight,
          0.0,
          weight,
          weight,
          weight,
          weight,
          weight,
          weight,
          weight,
        ]
      : [
          weight,
          weight,
          weight,
          weight,
          0.0,
          0.0,
          weight,
          weight,
          weight,
          weight,
          weight,
          weight,
          weight,
          weight,
          weight,
          weight,
        ],
  Composition: (isSdXl: boolean, weight: number) =>
    isSdXl
      ? [0.0, 0.0, 0.0, weight, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
      : [
          0.0,
          0.0,
          0.0,
          0.0,
          weight * 0.25,
          weight,
          0.0,
          0.0,
          0.0,
          0.0,
          0.0,
          0.0,
          0.0,
          0.0,
          0.0,
          0.0,
        ],
  "Style and Composition": (
    isSdXl: boolean,
    weight: number,
    weight_composition: number
  ) =>
    isSdXl
      ? [
          0.0,
          0.0,
          0.0,
          weight_composition,
          0.0,
          0.0,
          weight,
          0.0,
          0.0,
          0.0,
          0.0,
        ]
      : [
          weight,
          weight,
          weight,
          weight,
          weight_composition * 0.25,
          weight_composition,
          weight,
          weight,
          weight,
          weight,
          weight,
          weight,
          weight,
          weight,
          weight,
          weight,
        ],
  "Strong Style and Composition": (
    isSdXl: boolean,
    weight: number,
    weight_composition: number
  ) =>
    isSdXl
      ? [
          weight,
          weight,
          weight,
          weight_composition,
          weight,
          weight,
          weight,
          weight,
          weight,
          weight,
          weight,
        ]
      : [
          weight,
          weight,
          weight,
          weight,
          weight_composition,
          weight_composition,
          weight,
          weight,
          weight,
          weight,
          weight,
          weight,
          weight,
          weight,
          weight,
          weight,
        ],
};
