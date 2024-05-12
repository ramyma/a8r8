import { KeyboardEventHandler, useCallback, useEffect } from "react";

interface Props {
  handleKeydown: KeyboardEventHandler;
  /**
   * Accept key events from any target element.
   * When false, only events from the `body` element is processed
   */
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
