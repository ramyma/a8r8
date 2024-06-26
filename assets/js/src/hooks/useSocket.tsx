import { useCallback, useContext, useMemo } from "react";
import SocketContext from "../context/SocketContext";
import throttle from "lodash.throttle";

const useSocket = () => {
  const { channel, presenceChannel } = useContext(SocketContext);
  const sendMessage = useCallback(
    (message: string, payload = {}, timeout?: number | undefined) => {
      if (channel) return channel.push(message, payload, timeout);
    },
    [channel]
  );

  const sendPresenceMessage = useMemo(
    () =>
      throttle(
        (message: string, payload = {}, timeout?: number | undefined) => {
          if (presenceChannel) {
            return presenceChannel.push(message, payload, timeout);
          }
        },
        16
      ),
    [presenceChannel]
  );

  const sendMessageAndReceive: <T>(
    message: string,
    ...args: any
  ) => Promise<T> = useCallback(
    (message, ...args) => {
      return new Promise((resolve, _) =>
        sendMessage(message, ...args)?.receive("ok", (params) => {
          resolve(params);
        })
      );
    },
    [sendMessage]
  );

  const getData = useCallback(
    (name: string, ...args) => sendMessageAndReceive(`get_${name}`, ...args),
    [sendMessageAndReceive]
  );

  const broadcastSelectionBoxUpdate = useCallback(
    (selectionBoxUpdate) => {
      sendPresenceMessage("update_selection_box", selectionBoxUpdate);
    },
    [sendPresenceMessage]
  );
  return {
    channel,
    getData,
    sendMessage,
    sendMessageAndReceive,
    sendPresenceMessage,
    broadcastSelectionBoxUpdate,
  };
};

export default useSocket;
