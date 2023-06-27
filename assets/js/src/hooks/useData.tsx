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
};

const useData = <T,>({ name, callback, fetchPolicy = "lazy" }: Props) => {
  const { getData } = useSocket();
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

    if (!ref.current && fetchPolicy === "eager" && isConnected) {
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
  ]);

  useEffect(() => {
    return () => {
      if (!isConnected) ref.current = false;
    };
  }, [isConnected]);

  return { fetchData, data };
};

export default useData;
