import { Link1Icon, LinkBreak1Icon, PersonIcon } from "@radix-ui/react-icons";
import { useAppSelector } from "./hooks";
import { selectIsConnected, selectStats } from "./state/statsSlice";
import useProgress from "./hooks/useProgress";
import { useSelector } from "react-redux";
import { selectSessions } from "./state/sessionsSlice";
import { selectBackend } from "./state/optionsSlice";

const Stats = () => {
  const stats = useAppSelector(selectStats);
  const isConnected = useAppSelector(selectIsConnected);
  const backend = useAppSelector(selectBackend);

  useProgress({});

  const etaMins = Math.floor(stats?.etaRelative / 60);
  const etaSecs = Math.round(stats?.etaRelative % 60);

  const vRamUsage = Math.round(stats.vRamUsage);
  const ramUsage = Math.round(stats.ramUsage);

  return (
    <>
      {!!VERSION && (
        <div className="text-sm text-neutral-700/90 pointer-events-none select-none">
          {VERSION}
        </div>
      )}
      <div className="text-xs flex w-fit flex-col gap-1 bg-black/90 backdrop-blur-md rounded-sm p-4 shadow-md shadow-black/20">
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
            <span className="text-sm font-semibold">{vRamUsage}%</span>
          </div>
        )}
        {backend === "comfy" && !!stats.ramUsage && isConnected && (
          <div className="flex gap-2 items-baseline">
            <span className="text-neutral-300">Mem:</span>
            <span
              className={`transition-colors text-sm font-semibold ${stats.ramUsage > 94 ? "text-danger" : ""}`}
            >
              {ramUsage}%
            </span>
          </div>
        )}
        <ConnectionStatus isConnected={isConnected} backend={backend} />
        <SessionsStatus />
      </div>
    </>
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
