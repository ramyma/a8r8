import Fuse, { IFuseOptions } from "fuse.js";
import { useCallback, useMemo } from "react";

const DEFAULT_OPTIONS = {
  includeScore: true,
};

type Props<T> = { filter?: string; options?: IFuseOptions<T> } | undefined;

function useFuzzySearch<T = string>(
  items: Readonly<T[]>,
  { filter, options = {} }: Props<T> = {}
): {
  filteredItems?: T[];
  searchItems: (...args: Parameters<Fuse<T>["search"]>) => T[];
} {
  const fuseOptions: IFuseOptions<T> = useMemo(
    () => ({
      ...DEFAULT_OPTIONS,
      ...options,
    }),
    [options]
  );
  const fuse = useMemo(
    () => new Fuse(items, fuseOptions),
    [fuseOptions, items]
  );

  const searchItemsRaw = useCallback((query) => fuse.search(query), [fuse]);

  const searchItems: (...args: Parameters<Fuse<T>["search"]>) => Readonly<T[]> =
    useCallback(
      (query) =>
        query ? searchItemsRaw(query).map(({ item }) => item) : items,
      [items, searchItemsRaw]
    );

  const updateFilteredItems = useCallback(
    // debounce(
    (value) => {
      if (value) {
        const resultItems = searchItems(value);
        return resultItems ?? [];
      } else {
        return items ?? [];
      }
    },
    // , 200),
    [items, searchItems]
  );

  const filteredItems = useMemo(() => {
    if (filter !== undefined) return updateFilteredItems(filter) ?? [];
    return searchItems;
  }, [filter, searchItems, updateFilteredItems]);

  return { searchItems, filteredItems };
}

export default useFuzzySearch;
