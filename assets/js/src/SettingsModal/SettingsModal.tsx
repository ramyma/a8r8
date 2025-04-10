import Link from "../components/Link";
import Modal, { ModalProps } from "../components/Modal";
import ScrollArea from "../components/ScrollArea";

import useBackend from "../hooks/useBackend";
import ModelsSection from "./ModelsSection";
import { useState } from "react";
import ExtensionsSection from "./ExtensionsSection";
import SettingsSectionContainer from "./SettingsSectionContainer";
import useIsConnected from "../hooks/useIsConnected";

type Props = ModalProps;

const SettingsModal = ({ open, ...props }: Props) => {
  const { backend } = useBackend();
  const isConnected = useIsConnected();

  const [activeSection, setActiveSection] = useState("models");

  // useEffect(() => {
  //   !selectedModelState && setSelectedModelState(selectedModel);
  // }, [selectedModel, selectedModelState]);
  const showExtensions = backend == "comfy" && isConnected;
  return (
    <Modal
      disableScroll
      open={open}
      {...props}
      className={
        "h-full flex flex-col justify-between gap-4 items-baseline p-0"
      }
      containerClassName="w-[70vw]"
      scroll={false}
    >
      <div className="flex flex-1 w-full relative overflow-hidden">
        <div className="bg-neutral-950 border-neutral-900/60 border-r flex-1 shrink-0 p-5 overflow-hidden">
          <ScrollArea className="text-start">
            <div className="flex flex-col gap-3">
              {/* <Link onClick={() => setActiveSection("cviit")}>Civit</Link> */}
              <h3 className="text-lg text-neutral-200 border-b border-neutral-800/80 pb-1 mb-2">
                Settings
              </h3>
              <Link
                onClick={() => setActiveSection("models")}
                className="text-sm text-neutral-100 hover:text-neutral-200 data-active:text-primary"
                data-active={activeSection === "models" || undefined}
              >
                Models
              </Link>
              {backend == "comfy" && isConnected && (
                <Link
                  onClick={() => setActiveSection("extensions")}
                  className="text-sm text-neutral-100 hover:text-neutral-200 data-active:text-primary"
                  data-active={activeSection === "extensions" || undefined}
                >
                  Extensions
                </Link>
              )}
            </div>
          </ScrollArea>
        </div>
        <div className="flex flex-col flex-7  bg-neutral-950/80 shrink-0 text-start">
          {/* <form
            onSubmit={handleSubmit(onSubmit)}
            className="relative flex-1 h-full"
          > */}
          <ScrollArea className="flex flex-col content-start" type="scroll">
            <div className="h-full flex-1 shrink grow-0 p-7">
              {/* {activeSection == "civit" && (
                  <Label className="flex flex-col gap-2">
                    API Token
                    <Controller
                      name="civit.api_token"
                      control={control}
                      render={({ field }) => (
                        <Input type="password" {...field} />
                      )}
                    />
                  </Label>
                )} */}

              {activeSection == "models" && (
                <SettingsSectionContainer>
                  <ModelsSection open={open} />
                </SettingsSectionContainer>
              )}
              {showExtensions && activeSection == "extensions" && (
                <SettingsSectionContainer>
                  <ExtensionsSection />
                </SettingsSectionContainer>
              )}
            </div>
          </ScrollArea>

          {/* </form> */}
        </div>
      </div>
    </Modal>
  );
};

export default SettingsModal;
