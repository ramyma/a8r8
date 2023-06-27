import { Channel } from "phoenix";
import { createContext } from "react";

const SocketContext = createContext<{
  socket: any;
  channel: Channel | null;
  presenceChannel: Channel | null;
}>({
  socket: null,
  channel: null,
  presenceChannel: null,
});
export default SocketContext;
