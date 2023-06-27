import {
  combineReducers,
  configureStore,
  PreloadedState,
} from "@reduxjs/toolkit";
import canvasReducer from "./state/canvasSlice";
import controlnetReducer from "./state/controlnetSlice";
import dataSliceReducer from "./state/dataSlice";
import generationParamsSliceReducer from "./state/generationParamsSlice";
import optionsReducer from "./state/optionsSlice";
import statsReducer, { updateStats } from "./state/statsSlice";
import layersReducer, { layersSlice } from "./state/layersSlice";
import selectionBoxReducer, {
  updateSelectionBox,
} from "./state/selectionBoxSlice";
import sessionsReducer from "./state/sessionsSlice";
import historyReducer from "./state/historySlice";

import undoable, { combineFilters, includeAction } from "redux-undo";
import undoFilter from "./utils";

const rootReducer = //undoable(
  combineReducers({
    canvas: canvasReducer,
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

export function setupStore(preloadedState?: PreloadedState<RootState>) {
  return configureStore({
    reducer: rootReducer,
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
