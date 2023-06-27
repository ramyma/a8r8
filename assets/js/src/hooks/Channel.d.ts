type Callback = (...args: any[]) => void;
type Ref = number;
export interface Channel {
  join: (timeout?: number) => Channel;
  on: (event: string, callback: Callback) => Ref;
  off: (event: string, ref: Ref) => void;
  push: (event: string, payload: any, timeout?: number) => Channel;
  receive: (status: any, callback: Callback) => Channel;
  state: "closed" | "errored" | "joined" | "joining" | "leaving";
  sendMessage;
}
