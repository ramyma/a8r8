import { useCallback, useEffect } from "react";

interface Props {
  handleKeydown: (event: KeyboardEvent) => void;
  /**
   * Accept key events from any target element.
   * When false, only events from the `body` element is processed
   */
  override?: boolean;
}

const useGlobalKeydown = ({ handleKeydown, override = false }: Props) => {
  const handler = useCallback(
    (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (["TEXTAREA", "INPUT"].includes(target.nodeName)) {
        if (event.key !== "Enter" || !event.ctrlKey) {
          event.stopPropagation();
          return;
        }
      }
      if (
        (target.role !== "textbox" &&
          target.role !== "input" &&
          target.role !== "combobox" &&
          target.role !== "slider") ||
        override
      ) {
        handleKeydown(event);
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
