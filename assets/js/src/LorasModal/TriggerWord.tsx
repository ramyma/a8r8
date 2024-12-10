import Button from "../components/Button";
import { MouseEventHandler, useEffect, useState } from "react";
import { CheckIcon, CopyIcon } from "@radix-ui/react-icons";

type Props = { children: string };

const TriggerWord = ({ children: word }: Props) => {
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setIsCopied(false), 1500);

    return () => {
      clearTimeout(timeout);
    };
  }, [isCopied]);
  const handleClick: MouseEventHandler = (_event) => {
    if (!isCopied) {
      navigator.clipboard.writeText(word);
      setIsCopied(true);
    }
  };
  return (
    <Button
      className="p-1 h-fit enabled:bg-success/80 enabled:hover:bg-success/95 rounded enabled:border-green-600/80 enabled:hover:border-green-600/80 enabled:text-green-50 transition-all text-start w-fit gap-3 flex"
      onClick={handleClick}
      title="Copy"
    >
      {/* {isCopied ? "Copied!" : word} */}
      <span>{word}</span>
      <span className="flex-1 flex-shrink-0">
        {isCopied ? <CheckIcon /> : <CopyIcon />}
      </span>
    </Button>
  );
};
export default TriggerWord;
