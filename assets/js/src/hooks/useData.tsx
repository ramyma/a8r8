import { useCallback, useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "../hooks";
import {
  selectData,
  updateData,
  updateDataItemByProperty,
} from "../state/dataSlice";
import { selectIsConnected } from "../state/statsSlice";
import useSocket from "./useSocket";
import { Channel } from "./Channel";

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
  async?: boolean;
};

const useData = <T,>({
  name,
  callback,
  fetchPolicy = "lazy",
  forceRequest = false,
  condition = true,
  async: asyncData = true,
}: UseDataProps<T>): {
  fetchData: () => Promise<T>;
  data: T;
  channel: Channel | null;
  isFetching: boolean;
} => {
  const { channel, getData } = useSocket();
  const [isFetching, setIsFetching] = useState(false);
  const ref = useRef(false);
  const dataState = useAppSelector(selectData);
  const isConnected = useAppSelector(selectIsConnected);
  const data: T = dataState[name];
  const dispatch = useAppDispatch();

  const fetchData = useCallback(
    async (async: boolean = asyncData): Promise<T | undefined> => {
      setIsFetching(true);
      try {
        const data: T = await getData({ name, async: async });

        // if (!async) {
        if (callback) {
          await callback(data);
        }
        dispatch(updateData({ [name]: data }));
        // }
      } catch (error) {
        console.error(error);
      } finally {
        setIsFetching(false);
      }
      return data;
    },
    [asyncData, callback, data, dispatch, getData, name]
  );

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

  useEffect(() => {
    if (fetchPolicy === "eager" && channel) {
      const ref = channel.on(
        `item_update_${name}`,
        async ({
          data,
        }: {
          data: { property: string; key: string; value: Partial<T> };
        }) => {
          const { property, key, value } = data;
          dispatch(
            updateDataItemByProperty({ dataKey: name, property, key, value })
          );
        }
      );
      return () => {
        channel.off(`item_update_${name}`, ref);
      };
    }
  }, [callback, channel, dispatch, fetchPolicy, name]);

  return { fetchData, data, channel, isFetching };
};

export default useData;
