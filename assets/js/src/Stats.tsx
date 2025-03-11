import { Link1Icon, LinkBreak1Icon, PersonIcon } from "@radix-ui/react-icons";
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
    <div className="flex absolute bottom-2 right-2 z-10 items-end gap-2 select-none">
      {!!VERSION && (
        <div className="text-sm text-neutral-700/90 pointer-events-none select-none">
          {VERSION}
        </div>
      )}
      <Select
        className="w-fit!"
        items={[
          { label: "A1111", value: "auto" },
          { label: "Forge", value: "forge" },
          { label: "Comfy", value: "comfy" },
        ]}
        title="Select Backend"
        value={backend}
        disabled={!!stats.progress}
        onChange={handleBackendChange}
      />
      <div className="text-xs flex w-fit flex-col gap-1 bg-black/90 backdrop-blur-xs rounded-sm p-4 shadow-md shadow-black/20">
        {isConnected && stats.progress !== 0 && (
          <>
            {stats?.progress > 1 &&
              !!stats?.etaRelative &&
              stats?.etaRelative > 0 && (
                <span className="text-orange-400">
                  ETA: {etaMins ? `${etaMins}m` : ""}
                  {etaSecs}s
                </span>
              )}
            <div className="flex gap-2 items-baseline text-orange-400 ">
              <span className="text-sm">Progress:</span>
              <span className="text-sm font-semibold">{stats.progress}%</span>
            </div>
          </>
        )}

        {!!stats.vRamUsage && isConnected && (
          <div className="flex gap-2 items-baseline">
            <span className="text-neutral-300">VRAM:</span>
            <span className="text-sm font-semibold">
              {Math.round(stats.vRamUsage)}%
            </span>
          </div>
        )}
        {backend === "comfy" && !!stats.ramUsage && isConnected && (
          <div className="flex gap-2 items-baseline">
            <span className="text-neutral-300">Mem:</span>
            <span className="text-sm font-semibold">
              {Math.round(stats.ramUsage)}%
            </span>
          </div>
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
