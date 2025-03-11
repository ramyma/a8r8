// import "./wdyr"; // <--- first import
import "vite/modulepreload-polyfill";
import React, { createRef } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { store } from "./store";
import { Provider } from "react-redux";
import SocketProvider from "./context/SocketProvider";
import RefsContext from "./context/RefsContext";
import ThemeContext, { theme } from "./context/ThemeContext";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Provider store={store}>
      <SocketProvider>
        <RefsContext.Provider
          value={{
            canvasContainerRef: createRef(),
            controlnetLayerRef: createRef(),
            imageLayerRef: createRef(),
            maskCompositeRectRef: createRef(),
            maskGroupRef: createRef(),
            regionMasksGroupRef: createRef(),
            overlayLayerRef: createRef(),
            selectionBoxLayerRef: createRef(),
            selectionBoxRef: createRef(),

            stageRef: createRef(),
            batchResultPreviewImageRef: createRef(),
          }}
        >
          <ThemeContext.Provider value={theme}>
            <App />
          </ThemeContext.Provider>
        </RefsContext.Provider>
      </SocketProvider>
    </Provider>
  </React.StrictMode>
);
