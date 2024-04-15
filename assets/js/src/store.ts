import {
  combineReducers,
  configureStore,
  // createListenerMiddleware,
  PreloadedState,
} from "@reduxjs/toolkit";
import canvasReducer from "./state/canvasSlice";
import linesReducer from "./state/linesSlice";
import controlnetReducer from "./state/controlnetSlice";
import promptRegionsReducer from "./state/promptRegionsSlice";
import dataSliceReducer from "./state/dataSlice";
import generationParamsSliceReducer from "./state/generationParamsSlice";
import optionsReducer from "./state/optionsSlice";
import statsReducer, { updateStats } from "./state/statsSlice";
import layersReducer from "./state/layersSlice";
import selectionBoxReducer from "./state/selectionBoxSlice";
import sessionsReducer from "./state/sessionsSlice";
import historyReducer from "./state/historySlice";

import undoable from "redux-undo";
import undoFilter from "./utils";

const rootReducer = //undoable(
  combineReducers({
    canvas: canvasReducer,
    lines: undoable(linesReducer, { filter: undoFilter, syncFilter: true }),
    //  undoable(canvasReducer, {
    //   filter:
    //     /*combineFilters(includeAction(updateSelectionBox.type),*/ undoFilter, //),
    //   syncFilter: true,
    // }),
    stats: statsReducer,
    generationParams: generationParamsSliceReducer,
    data: dataSliceReducer,
    options: optionsReducer,
    controlnet: controlnetReducer,
    promptRegions: promptRegionsReducer,
    layers: layersReducer,
    selectionBox: selectionBoxReducer,
    sessions: sessionsReducer,
    history: historyReducer,
  });
//,
// {
//   filter: combineFilters(
//     undoFilter,
//     includeAction(
//       updateSelectionBox.type,
//       Object.values(layersSlice.actions).map((x) => x().type)
//     )
//   ),
//   // syncFilter: true,
// }
// );

// Create the middleware instance and methods
// const listenerMiddleware = createListenerMiddleware();

// Add one or more listener entries that look for specific actions.
// They may contain any sync or async logic, similar to thunks.
// listenerMiddleware.startListening({});

export function setupStore(preloadedState?: PreloadedState<RootState>) {
  return configureStore({
    reducer: rootReducer,
    // middleware: (getDefaultMiddleware) =>
    //   getDefaultMiddleware().prepend(listenerMiddleware.middleware),
    devTools: {
      actionsDenylist: [updateStats.type],
    },
    preloadedState,
  });
}

export const store = setupStore();

export type RootState = ReturnType<typeof rootReducer>;
export type AppStore = ReturnType<typeof setupStore>;
export type AppDispatch = typeof store.dispatch;
