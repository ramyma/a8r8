import { useCallback, useEffect } from "react";

interface Props {
  handleKeydown: (e: KeyboardEvent) => void;
  override?: boolean;
}

const useGlobalKeydown = ({ handleKeydown, override = false }: Props) => {
  const handler = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (["TEXTAREA", "INPUT"].includes(target.nodeName)) {
        if (e.key !== "Enter" || !e.ctrlKey) {
          e.stopPropagation();
          return;
        }
      }
      if (target.nodeName === "BODY" || override) {
        handleKeydown(e);
      }
    },
    [handleKeydown, override]
  );

  useEffect(() => {
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
    };
  }, [handleKeydown, handler]);
};

export default useGlobalKeydown;
