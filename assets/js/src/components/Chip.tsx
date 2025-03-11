import { MouseEventHandler } from "react";
import { Cross1Icon } from "@radix-ui/react-icons";

type Props = {
  label: string;
  onRemove?: MouseEventHandler;
};

const Chip = ({ label, onRemove }: Props) => {
  return (
    <div className="flex gap-2 place-items-center bg-neutral-900 border-neutral-700 p-2 rounded-xs justify-between w-full text-start">
      <span
        className="text-nowrap overflow-hidden text-ellipsis max-w-56"
        title={label}
      >
        {label}
      </span>
      {onRemove && (
        <div
          onClick={onRemove}
          className="rounded-full p-2 bg-neutral-900 hover:bg-neutral-700 transition-all"
          title=""
        >
          <Cross1Icon />
        </div>
      )}
    </div>
  );
};

export default Chip;
