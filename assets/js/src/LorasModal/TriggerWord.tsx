import { MouseEventHandler } from "@remirror/extension-events";
import Button from "../components/Button";
import { useEffect, useRef, useState } from "react";

const TriggerWord = ({ children: word }) => {
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setIsCopied(false), 1500);

    return () => {
      clearTimeout(timeout);
    };
  }, [isCopied]);
  const handleClick: MouseEventHandler = (e) => {
    if (!isCopied) {
      navigator.clipboard.writeText(word);
      setIsCopied(true);
    }
  };
  return (
    <Button
      className="p-1 h-fit enabled:bg-success/80 enabled:hover:bg-success/95 rounded transition-all"
      onClick={handleClick}
      title="Copy"
    >
      {isCopied ? "Copied!" : word}
    </Button>
  );
};
export default TriggerWord;
