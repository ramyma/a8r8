import { useCallback, useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "../hooks";
import { selectData, updateData } from "../state/dataSlice";
import { selectIsConnected } from "../state/statsSlice";
import useSocket from "./useSocket";

export type FetchPolicy = "lazy" | "eager";
type Props = {
  name: string;
  callback?: (data) => void;
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
}: Props) => {
  const { channel, getData } = useSocket();
  const ref = useRef(false);
  const dataState = useAppSelector(selectData);
  const isConnected = useAppSelector(selectIsConnected);
  const data: T = dataState[name];
  const dispatch = useAppDispatch();

  const fetchData = useCallback(async (): Promise<T> => {
    const data: any = await getData(name);
    dispatch(updateData({ [name]: data }));
    return data;
  }, [dispatch, getData, name]);

  useEffect(() => {
    async function get() {
      const data = await fetchData();
      callback && callback(data);
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
    callback,
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
        }
      );
      return () => {
        channel.off(`update_${name}`, ref);
      };
    }
  }, [channel, dispatch, fetchPolicy, name]);

  return { fetchData, data };
};

export default useData;
