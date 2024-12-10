import { useCallback, useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../hooks";

import {
  selectIsConnected,
  selectIsSocketConnected,
  setIsBackendConnected,
  setIsSocketConnected,
} from "../state/statsSlice";
import useSocket from "./useSocket";

const useIsConnected = () => {
  const dispatch = useAppDispatch();
  const isConnected = useAppSelector(selectIsConnected);
  const isSocketConnected = useAppSelector(selectIsSocketConnected);
  const ref = useRef(false);
  const { sendMessageAndReceive, socket } = useSocket();
  const handleSocketClose = useCallback(() => {
    if (isSocketConnected) {
      dispatch(setIsSocketConnected(false));
    }
  }, [dispatch, isSocketConnected]);

  useEffect(() => {
    const ref = socket?.onClose(handleSocketClose);
    return () => {
      ref && socket?.off(ref);
    };
  }, [handleSocketClose, socket]);

  const handleSocketOpen = useCallback(() => {
    if (!isSocketConnected) {
      dispatch(setIsSocketConnected(true));
    }
  }, [dispatch, isSocketConnected]);

  useEffect(() => {
    const ref = socket?.onOpen(handleSocketOpen);
    return () => {
      ref && socket?.off(ref);
    };
  }, [handleSocketOpen, socket]);

  useEffect(() => {
    async function get() {
      const isConnected =
        await sendMessageAndReceive<Promise<boolean>>("get_is_connected");
      dispatch(setIsBackendConnected(isConnected));
    }
    if (!ref.current) {
      ref.current = true;
      get();
    }
  }, [dispatch, sendMessageAndReceive]);

  return isSocketConnected && isConnected;
};

export default useIsConnected;
