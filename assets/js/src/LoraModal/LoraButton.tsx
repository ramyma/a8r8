import { useTransition, animated, config, useSpring } from "@react-spring/web";
import Button, { ButtonProps } from "../components/Button";
import { Lora } from "../App.d";
import LoraDetails from "./LoraDetails";

export const LoraButton = ({
  active,
  name,
  alias,
  metadata: { ss_base_model_version: baseModel } = {},
  metadata = {},
  isSdXlModel,
  onClick,
}: Lora & {
  isSdXlModel: boolean;
  onClick: ButtonProps["onClick"];
  active: boolean;
}) => {
  const isSdXl =
    name?.toLowerCase().includes("xl") ||
    baseModel?.toLowerCase().includes("xl");
  const isDisabled = false; //isSdXlModel && !isSdXl;

  const detailsStyle = useSpring({
    to: {
      opacity: active ? 1 : 0,
      x: 0,
      y: active ? 0 : 100,
      pointerEvents: active ? "auto" : "none",
    },
  });
  return (
    <div
      key={name}
      className={`h-full flex flex-col items-start gap-5 p-4 text-sm text-wrap select-none rounded bg-neutral-800/70 border border-neutral-700 w-full h-44 overflow-hidden place-items-center ease-in-out duration-300 transition-all hover:cursor-pointer ${active ? "hover:cursor-auto" : "hover:border-neutral-500 "}`}
      onClick={onClick}
      disabled={isDisabled}
    >
      {name}
      <div
        className={`absolute right-0 top-0 ${
          isDisabled
            ? "bg-neutral-900/40"
            : isSdXl
              ? "bg-green-300/50 text-green-100"
              : "bg-orange-300/50 text-orange-100"
        } p-2 rounded`}
      >
        {isSdXl ? "SD XL" : "SD 1.5"}
      </div>
      {active && (
        <animated.div
          style={detailsStyle}
          className={`flex flex-col gap-4 w-full h-full ${active ? "" : "pointer-events-none"}`}
        >
          <LoraDetails name={name} metadata={metadata} />
        </animated.div>
      )}
    </div>
  );
};
