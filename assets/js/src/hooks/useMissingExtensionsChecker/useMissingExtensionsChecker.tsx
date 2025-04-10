import { getMissingExtensions } from "./utils";
import useExtensions from "../useExtensions";
import useSocket from "../useSocket";
import { useMemo } from "react";

const useMissingExtensionsChecker = ({
  extensions,
}: {
  extensions: ReturnType<typeof useExtensions>["extensions"];
}): {
  missingExtensions: string[];
  installMissingExtensions: () => void;
  restartComfy: () => void;
} => {
  const missingExtensions = useMemo(() => {
    if (extensions) return getMissingExtensions(extensions)?.toSorted();
    return [];
  }, [extensions]);

  const { sendMessage } = useSocket();

  const installMissingExtensions = () => {
    sendMessage("install_missing_extensions", {
      extensions: missingExtensions,
    });
  };

  const restartComfy = () => {
    sendMessage("restart_comfy");
  };

  return { missingExtensions, installMissingExtensions, restartComfy };
};

export default useMissingExtensionsChecker;
