import { useCallback, useContext } from "react";
import SocketContext from "../context/SocketContext";
import throttle from "lodash.throttle";
import { showNotification } from "../Notifications/utils";

const useSocket = () => {
  const { channel, presenceChannel } = useContext(SocketContext);
  const sendMessage = useCallback(
    (message: string, payload = {}, timeout?: number | undefined) => {
      if (channel) return channel.push(message, payload, timeout);
    },
    [channel]
  );
  const sendPresenceMessage = useCallback(
    (message: string, payload = {}, timeout?: number | undefined) => {
      if (presenceChannel)
        return presenceChannel.push(message, payload, timeout);
    },
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
    throttle((selectionBoxUpdate) => {
      sendPresenceMessage("update_selection_box", selectionBoxUpdate);
    }, 16),
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
