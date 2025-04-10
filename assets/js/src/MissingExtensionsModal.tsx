import { MouseEventHandler, useCallback, useEffect } from "react";
import Button from "./components/Button";
import Modal from "./components/Modal";
import { useAppSelector } from "./hooks";
import { selectIsConnected } from "./state/statsSlice";
import useExtensions from "./hooks/useExtensions";
import { useState } from "react";

const MissingExtensionsModal = ({
  missingExtensions,
  onInstall,
  onRestart,
}: {
  missingExtensions: string[];
  onInstall: () => void;
  onRestart: () => void;
}) => {
  const isConnected = useAppSelector(selectIsConnected);
  const { comfyManagerStatus } = useExtensions();

  const getIsOpen = useCallback(
    () =>
      isConnected &&
      (missingExtensions?.length > 0 || comfyManagerStatus === "success"),
    [comfyManagerStatus, isConnected, missingExtensions?.length]
  );
  const [isOpen, setIsOpen] = useState(getIsOpen);

  useEffect(() => {
    const newState = getIsOpen();
    if (newState != isOpen) setIsOpen(newState);
  }, [getIsOpen, isConnected, isOpen, missingExtensions]);

  const handleInstallClick: MouseEventHandler = (_event) => {
    onInstall();
  };

  const handleRestartClick: MouseEventHandler = (_event) => {
    onRestart();
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      containerClassName="w-[30vw] h-[60vh] min-w-[445px]"
      className="h-full"
      title="Missing Comfy Extensions"
      titleClassName="text-warning"
    >
      <div className="flex flex-1 w-full">
        <div className="flex flex-col gap-4 h-full flex-1">
          {missingExtensions?.length > 0 ? (
            <ul className="flex flex-col text-left gap-3 text-sm">
              {missingExtensions?.map((ext) => <li key={ext}>{ext}</li>)}
            </ul>
          ) : (
            <p className="text-left text-sm">
              All missing extensions were installed.
            </p>
          )}
        </div>
        {
          <Button
            className={`sticky bottom-8 self-end`}
            onClick={
              comfyManagerStatus === "success"
                ? handleRestartClick
                : handleInstallClick
            }
            loading={comfyManagerStatus === "processing"}
          >
            {comfyManagerStatus === "success"
              ? "Restart"
              : comfyManagerStatus === "processing"
                ? "Installing"
                : "Install"}
          </Button>
        }
      </div>
    </Modal>
  );
};

export default MissingExtensionsModal;
