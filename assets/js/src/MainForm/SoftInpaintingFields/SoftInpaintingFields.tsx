import { Control, Controller, useWatch } from "react-hook-form";
import { useSpring, animated } from "@react-spring/web";
import { softPaintingFields } from "./contsants";
import Slider from "../../components/Slider";
import Checkbox from "../../components/Checkbox";
import { MainFormValues } from "../MainForm";

export type SoftInpaintingArgs = {
  isSoftInpaintingEnabled?: boolean;

  /**
   * The blending strength of original content is scaled proportionally with the decreasing noise level values at each step (sigmas).
   *This ensures that the influence of the denoiser and original content preservation is roughly balanced at each step.
   *This balance can be shifted using this parameter, controlling whether earlier or later steps have stronger preservation.
   *
   *- Below 1: Stronger preservation near the end (with low sigma)
   *- 1: Balanced (proportional to sigma)
   *- Above 1: Stronger preservation in the beginning (with high sigma)
   *
   *    minimum: 0
   *    maximum: 8
   *    @default 1
   */
  "Schedule bias": number; // step: 0.1

  /**
   * Skews whether partially masked image regions should be more likely to preserve the original content or favor inpainted content.
   *This may need to be adjusted depending on the Schedule bias, CFG Scale, prompt and Denoising strength.
   *
   *- Low values: Favors generated content.
   *- High values: Favors original content.
   *
   *minimum: 0
   *    maximum: 8
   *@default 0.5
   */
  "Preservation strength": number; //"step": 0.05

  /**
   * This parameter controls how the original latent vectors and denoised latent vectors are interpolated.
   *With higher values, the magnitude of the resulting blended vector will be closer to the maximum of the two interpolated vectors.
   *This can prevent the loss of contrast that occurs with linear interpolation.
   *
   *Low values: Softer blending, details may fade.
   *High values: Stronger contrast, may over-saturate colors.
   *
   *minimum: 1,
   *    maximum: 32,
   *@default 4
   */
  "Transition contrast boost": number; //"step": 0.5

  /**
   * Mask influence
   *This parameter controls how much the mask should bias this sensitivity to difference.
   *
   *- 0: Ignore the mask, only consider differences in image content.
   *- 1: Follow the mask closely despite image content changes.
   *
   * minimum: 0
   *    maximum: 1
   *@default 0
   */
  "Mask influence": number; //"step": 0.05
  /**
   * This value represents the difference at which the original pixels will have less than 50% opacity.
   *
   *- Low values: Two images patches must be almost the same in order to retain original pixels.
   *- High values: Two images patches can be very different and still retain original pixels.
   *
   *minimum: 0
   *maximum: 8
   *@default 0.5
   */
  "Difference threshold": number; //"step": 0.25

  /**
   * This value represents the contrast between the opacity of the original and inpainted content.
   *
   *- Low values: The blend will be more gradual and have longer transitions, but may cause ghosting.
   *- High values: Ghosting will be less common, but transitions may be very sudden.
   *
   *minimum: 0
   *  maximum: 8
   *@default 2
   */
  "Difference contrast": number; //step: 0.2
};

const SoftInpaintingFields = ({
  control,
}: {
  control: Control<MainFormValues>;
}) => {
  const isSoftInpaintingEnabled = useWatch({
    control,
    name: "softInpainting.isSoftInpaintingEnabled",
  });

  const [style, api] = useSpring(
    () => ({
      height: isSoftInpaintingEnabled ? "100%" : "0%",
    }),
    [isSoftInpaintingEnabled]
  );

  return (
    <div className="flex flex-col gap-3">
      <Controller
        name={"softInpainting.isSoftInpaintingEnabled"}
        control={control}
        render={({ field }) => <Checkbox {...field}>Soft Inpainting</Checkbox>}
        defaultValue={false}
      />
      {isSoftInpaintingEnabled && (
        <animated.div style={style}>
          <div className="h-auto flex relative flex-col gap-8 bg-neutral-100/5 p-4 rounded-md overflow-hidden">
            {softPaintingFields?.map(({ value: defaultValue, ...rest }) => (
              <div key={rest.label}>
                <Controller
                  name={"softInpainting." + rest.label}
                  control={control}
                  render={({ field }) => <Slider {...rest} {...field} />}
                  defaultValue={defaultValue}
                />
              </div>
            ))}
          </div>
        </animated.div>
      )}
    </div>
  );
};

export default SoftInpaintingFields;
