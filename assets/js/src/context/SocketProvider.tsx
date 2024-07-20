import React, {
  ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Socket, Presence, Channel } from "phoenix";
import SocketContext from "./SocketContext";
import { useAppDispatch } from "../hooks";
import { setIsConnected } from "../state/statsSlice";
import { setSessions } from "../state/sessionsSlice";
import { v4 as uuid4 } from "uuid";

export const sessionName = uuid4();

// TODO: pass through env variable
const socket = new Socket(`ws://${location.hostname}:4000/socket`);
socket.connect();
const channel = socket.channel("sd", {});
// TODO: make optional
const civitChannel = socket.channel("civit", {});
// TODO: move into useEffect to be avoid getting stuck disconnection
channel
  .join()
  .receive("ok", (resp) => {
    console.log("Joined successfully", resp);
  })
  .receive("error", (resp) => {
    console.log("Unable to join", resp);
  });

civitChannel
  .join()
  .receive("ok", (resp) => {
    console.log("Joined Civit successfully", resp);
  })
  .receive("error", (resp) => {
    console.log("Unable to join", resp);
  });

const SocketProvider = ({ children }: { children: ReactNode }) => {
  const dispatch = useAppDispatch();

  // TODO: optimise presence channel instantiation
  const joinedPresenceChannel = useRef<boolean>(false);
  const [presenceChannel, setPresenceChannel] = useState<Channel | null>(null);

  useLayoutEffect(() => {
    function renderOnlineUsers(presence) {
      // let sessions: any = {};
      const ret = presence.list((id, item) => {
        const {
          metas: [first],
        } = item;

        const { selection_box } = first;
        return { id, metas: { selectionBox: selection_box } };
      });

      const sessionsObj = ret.reduce(
        (acc, item) => ({ ...acc, [item.id]: item.metas }),
        {}
      );

      dispatch(setSessions(sessionsObj));
    }
    if (!joinedPresenceChannel.current) {
      const presenceChannel = socket.channel("room:lobby", {
        // name: window.location.search.split("=")[1],
        name: sessionName,
      });
      setPresenceChannel(presenceChannel);
      const presence = new Presence(presenceChannel);

      presence.onSync(() => renderOnlineUsers(presence));

      joinedPresenceChannel.current = true;
      presenceChannel.join().receive("ok", (resp) => {
        console.log("Joined presence successfully", resp);
      });
    }
  }, [dispatch]);

  useEffect(() => {
    const isConnectedRef = channel.on(
      "is_connected",
      ({ isConnected }: { isConnected: boolean }) => {
        dispatch(setIsConnected(isConnected));
      }
    );
    return () => {
      channel.off("is_connected", isConnectedRef);
    };
  }, [dispatch]);
  return (
    <SocketContext.Provider
      value={{ socket, channel, civitChannel, presenceChannel }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export default SocketProvider;
