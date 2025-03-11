import { useCallback, useContext, useMemo } from "react";
import SocketContext from "../context/SocketContext";
import throttle from "lodash.throttle";
import { showNotification } from "../Notifications/utils";

const useSocket = () => {
  const { channel, civitChannel, presenceChannel, socket } =
    useContext(SocketContext);
  const sendMessage = useCallback(
    (message: string, payload = {}, timeout?: number | undefined) => {
      if (channel) return channel.push(message, payload, timeout);
    },
    [channel]
  );

  const sendCivitMessage = useCallback(
    (message: string, payload = {}, timeout?: number | undefined) => {
      if (civitChannel) return civitChannel.push(message, payload, timeout);
    },
    [civitChannel]
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

  const sendMessageAndReceive: <T>({
    message,
    async,
    args,
  }: {
    message: string;
    async: boolean;
    args?: any[];
  }) => Promise<T | undefined> = useCallback(
    ({ message, async = true, args = [] }) => {
      return new Promise((resolve, _) => {
        sendMessage(message, ...args)?.receive("ok", (params) => {
          resolve(params);
        });
        if (async) resolve(undefined);
      });
    },
    [sendMessage]
  );

  const sendCivitMessageAndReceive: <T>(
    message: string,
    ...args: any
  ) => Promise<T> = useCallback(
    (message, ...args) => {
      return new Promise((resolve, reject) =>
        sendCivitMessage(message, ...args)
          ?.receive("ok", (params) => {
            resolve(params);
          })
          .receive("error", (resp) => {
            showNotification({
              title: "Civit Error",
              body: resp.error,
              type: "error",
            });
            reject(resp.error);
          })
      );
    },
    [sendCivitMessage]
  );

  const getData = useCallback(
    ({
      name,
      async = true,
      args = [],
    }: {
      name: string;
      async?: boolean;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      args?: any[];
    }) => {
      return sendMessageAndReceive({ message: `get_${name}`, async, args });
    },
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
    sendCivitMessage,
    sendCivitMessageAndReceive,
    broadcastSelectionBoxUpdate,
    socket,
  };
};

export default useSocket;
