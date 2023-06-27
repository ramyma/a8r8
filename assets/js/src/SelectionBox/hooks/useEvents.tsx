import useDragEvents from "./useDragEvents";
import useKeyEvents from "./useKeyEvents";

const useEvents = () => {
  const { isTransforming } = useDragEvents();

  useKeyEvents();

  return { isTransforming };
};

export default useEvents;
