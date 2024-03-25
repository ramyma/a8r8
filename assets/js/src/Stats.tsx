import { Link1Icon, LinkBreak1Icon, PersonIcon } from "@radix-ui/react-icons";
import React from "react";
import { useAppSelector } from "./hooks";
import { selectIsConnected, selectStats } from "./state/statsSlice";
import useProgress from "./hooks/useProgress";
import { useSelector } from "react-redux";
import { selectSessions } from "./state/sessionsSlice";
import { selectBackend } from "./state/optionsSlice";
import Select from "./components/Select";
import useBackend from "./hooks/useBackend";

const Stats = () => {
  const stats = useAppSelector(selectStats);
  const isConnected = useAppSelector(selectIsConnected);

  useProgress({});

  const etaMins = Math.floor(stats?.etaRelative / 60);
  const etaSecs = Math.round(stats?.etaRelative % 60);

  const backend = useAppSelector(selectBackend);
  const { changeBackend } = useBackend();
  const handleBackendChange = (backend) => {
    changeBackend(backend);
  };
  return (
    <div className="flex absolute bottom-2 right-2 z-10 items-end gap-2">
      <Select
        className="!w-fit"
        items={[
          { label: "A1111 / Forge", value: "auto" },
          { label: "Comfy", value: "comfy" },
        ]}
        title="Select Backend"
        value={backend}
        disabled={!!stats.progress}
        onChange={handleBackendChange}
      />
      <div className="text-sm flex w-fit flex-col gap-1 bg-black/90 backdrop-blur-sm rounded p-4 shadow-md shadow-black/20">
        {stats.isConnected && stats.progress !== 0 && (
          <>
            {stats?.progress > 1 &&
              !!stats?.etaRelative &&
              stats?.etaRelative > 0 && (
                <span className="text-orange-400">
                  ETA: {etaMins ? `${etaMins}m` : ""}
                  {etaSecs}s
                </span>
              )}
            <span className="text-orange-400">Progress: {stats.progress}%</span>
          </>
        )}
        {!!stats.vRamUsage && isConnected && (
          <span>vRam usage: {stats.vRamUsage}%</span>
        )}
        <ConnectionStatus isConnected={isConnected} backend={backend} />
        <SessionsStatus />
      </div>
    </div>
  );
};

const ConnectionStatus = ({
  isConnected,
  backend,
}: {
  isConnected: boolean;
  backend: string;
}) => {
  const textColorClass = isConnected ? "text-success" : "text-red-700";
  const text = isConnected ? `Connected (${backend})` : "Disconnected";
  return (
    <div
      className={`flex items-center gap-2 text-shadow shadow-black/20 ${textColorClass}`}
    >
      {isConnected ? <Link1Icon /> : <LinkBreak1Icon />}
      <span className="capitalize">{text}</span>
    </div>
  );
};

const SessionsStatus = () => {
  const sessions = useSelector(selectSessions);
  const sessionsEntries = Object.keys(sessions);
  const sessionsCount = sessionsEntries?.length;

  return sessionsCount > 1 ? (
    <div
      className={`flex items-center gap-2 text-shadow shadow-black/20 text-success`}
    >
      <PersonIcon />
      <span>{sessionsCount}</span>
    </div>
  ) : null;
};

export default Stats;
