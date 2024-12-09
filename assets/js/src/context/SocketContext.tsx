import { createContext } from "react";
import { Channel } from "../hooks/Channel";

const SocketContext = createContext<{
  socket: any;
  channel: Channel | null;
  civitChannel: Channel | null;
  presenceChannel: Channel | null;
}>({
  socket: null,
  channel: null,
  civitChannel: null,
  presenceChannel: null,
});
export default SocketContext;
