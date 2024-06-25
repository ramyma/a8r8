import { useCallback, useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "../hooks";
import { selectData, updateData } from "../state/dataSlice";
import { selectIsConnected } from "../state/statsSlice";
import useSocket from "./useSocket";

export type FetchPolicy = "lazy" | "eager";
export type UseDataProps<T> = {
  name: string;
  callback?: (data: T | undefined) => void;
  fetchPolicy?: FetchPolicy;
  forceRequest?: boolean;
  /**
   * Condition upon which the data is requested
   * @defaultValue `true`
   */
  condition?: boolean;
};

const useData = <T,>({
  name,
  callback,
  fetchPolicy = "lazy",
  forceRequest = false,
  condition = true,
}: UseDataProps<T>): { fetchData: () => Promise<T>; data: T } => {
  const { channel, getData } = useSocket();
  const ref = useRef(false);
  const dataState = useAppSelector(selectData);
  const isConnected = useAppSelector(selectIsConnected);
  const data: T = dataState[name];
  const dispatch = useAppDispatch();

  const fetchData = useCallback(async (): Promise<T> => {
    const data: T = await getData(name);
    callback && callback(data);
    dispatch(updateData({ [name]: data }));
    return data;
  }, [callback, dispatch, getData, name]);

  useEffect(() => {
    async function get() {
      await fetchData();
    }

    if (
      !ref.current &&
      fetchPolicy === "eager" &&
      (isConnected || forceRequest) &&
      condition
    ) {
      get();
      ref.current = true;
    }
  }, [
    fetchPolicy,
    data,
    dispatch,
    getData,
    name,
    fetchData,
    isConnected,
    forceRequest,
    condition,
  ]);

  useEffect(() => {
    return () => {
      if (!isConnected) ref.current = false;
    };
  }, [isConnected]);

  useEffect(() => {
    if (fetchPolicy === "eager" && channel) {
      const ref = channel.on(
        `update_${name}`,
        async ({ data }: { data: T }) => {
          dispatch(updateData({ [name]: data }));
          callback?.(data);
        }
      );
      return () => {
        channel.off(`update_${name}`, ref);
      };
    }
  }, [callback, channel, dispatch, fetchPolicy, name]);

  return { fetchData, data };
};

export default useData;
