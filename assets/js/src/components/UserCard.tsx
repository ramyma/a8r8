import React from "react";
import useLoras from "../hooks/useLoras";
import Slider from "./Slider";
import { useCommands } from "@remirror/react-core";
export default function UserCard({ node }) {
  const { code, value, from } = node.attrs;
  console.log(node);
  const { loras } = useLoras();
  const { updateNodeAttributes } = useCommands();

  return (
    <span
      className="card bg-white text-primary rounded p-1"
      onMouseOver={() => console.log(loras.find((lora) => lora.name === code))}
    >
      {`<lora:${code}:${value}>`}

      <div className="absolute bottom-[-10] left-0 w-50 h-30 ">
        <Slider
          min={-3}
          max={3}
          step={0.01}
          value={value}
          onChange={() => {
            updateNodeAttributes(4, { code, value: 3, from });
          }}
        />
      </div>
    </span>
  );
}
