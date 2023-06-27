import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "../store";

interface SessionsState {
  connected: {
    [id: string]: {
      selectionBox: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
    };
  };
}

export const initialState: SessionsState = { connected: {} };
export const sessionsSlice = createSlice({
  name: "sessions",
  initialState,
  reducers: {
    setSessions: (state: SessionsState, action) => {
      state.connected = action.payload;
    },
  },
});

export const { setSessions } = sessionsSlice.actions;

export const selectSessions = (state: RootState) => state.sessions.connected;

export default sessionsSlice.reducer;
