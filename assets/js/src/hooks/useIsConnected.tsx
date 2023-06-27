import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../hooks";

import { selectIsConnected, setIsConnected } from "../state/statsSlice";
import useSocket from "./useSocket";

const useIsConnected = () => {
  const dispatch = useAppDispatch();
  const isConnected = useAppSelector(selectIsConnected);
  const ref = useRef(false);
  const { sendMessageAndReceive } = useSocket();
  useEffect(() => {
    async function get() {
      const isConnected = await sendMessageAndReceive<Promise<boolean>>(
        "get_is_connected"
      );
      dispatch(setIsConnected(isConnected));
    }
    if (!ref.current) {
      ref.current = true;
      get();
    }
  }, [dispatch, sendMessageAndReceive]);

  return isConnected;
};

export default useIsConnected;
