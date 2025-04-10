import { useMemo } from "react";
import useExtensions from "../hooks/useExtensions";
import { REQUIRED_EXTENSIONS } from "../hooks/useMissingExtensionsChecker/utils";
import { CheckIcon, Cross2Icon } from "@radix-ui/react-icons";
import useMissingExtensionsChecker from "../hooks/useMissingExtensionsChecker/useMissingExtensionsChecker";
import Button from "../components/Button";
import { MouseEventHandler } from "react";
import useIsConnected from "../hooks/useIsConnected";

const ExtensionsSection = () => {
  const isConnected = useIsConnected();
  const { extensions, comfyManagerStatus } = useExtensions();
  const { installMissingExtensions, missingExtensions, restartComfy } =
    useMissingExtensionsChecker({
      extensions,
    });

  const relevantExtensions = useMemo(
    () =>
      REQUIRED_EXTENSIONS.toSorted().map(
        (name) => ({
          name,
          installed: !!extensions?.[name.toLocaleLowerCase()],
          ...extensions?.[name.toLocaleLowerCase()],
        }),
        []
      ),
    [extensions]
  );
  const handleInstallMissingClick: MouseEventHandler = () => {
    installMissingExtensions();
  };
  const handleRestartClick: MouseEventHandler = () => {
    restartComfy();
  };

  const loading = comfyManagerStatus === "processing";
  return (
    <div className="flex flex-col h-full">
      <ul className="flex flex-col text-sm pb-32">
        {relevantExtensions.map((ext) => (
          <li
            key={ext.name}
            className="flex justify-between border-b border-neutral-800 p-3 items-center"
          >
            <div>{ext.name}</div>
            {ext.installed ? (
              <CheckIcon className="text-success" />
            ) : (
              <Cross2Icon className="text-danger" />
            )}
          </li>
        ))}
      </ul>
      {comfyManagerStatus === "success" ? (
        <Button
          onClick={handleRestartClick}
          className="absolute bottom-8 right-8 shadow-lg"
          disabled={!isConnected}
        >
          Restart
        </Button>
      ) : (
        missingExtensions?.length > 0 && (
          <Button
            onClick={handleInstallMissingClick}
            className="absolute bottom-8 right-8 shadow-lg"
            loading={loading}
          >
            {loading ? "Installing" : "Install Missing"}
          </Button>
        )
      )}
    </div>
  );
};

export default ExtensionsSection;
