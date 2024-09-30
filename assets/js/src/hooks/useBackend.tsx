import { useEffect, useRef } from "react";
import { useAppDispatch } from "../hooks";
import { Backend, setBackend } from "../state/optionsSlice";
import useData, { FetchPolicy } from "./useData";
import useSocket from "./useSocket";

type Props = {
  fetchPolicy?: FetchPolicy;
};

const useBackend = ({ fetchPolicy }: Props = {}) => {
  const { sendMessage } = useSocket();
  const dispatch = useAppDispatch();
  const { fetchData, data: backend } = useData<Backend>({
    name: "backend",
    fetchPolicy,
    forceRequest: true,
  });

  const previousBackendRef = useRef<string>();
  useEffect(() => {
    if (fetchPolicy == "eager" && backend !== previousBackendRef.current) {
      previousBackendRef.current = backend;
      dispatch(setBackend(backend));
    }
  }, [backend, dispatch, fetchPolicy]);

  const changeBackend = (newBackend) => {
    backend !== newBackend && sendMessage("set_backend", newBackend);
  };

  return { backend, fetchData, changeBackend };
};

export default useBackend;
