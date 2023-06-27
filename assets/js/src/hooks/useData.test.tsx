import { renderHook } from "../testUtils";
import useData from "./useData";

describe("Test useData", () => {
  test("should refetch on reconnection", () => {
    const { result } = renderHook(() => useData({ name: "test" }));
  });

  // TODO: write test
});
