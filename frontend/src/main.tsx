import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { AppProvider } from "./contexts/AppContext";
import { PhotosProvider } from "./contexts/PhotosContext";
import { ViewportSimulatorProvider } from "./contexts/ViewportSimulatorContext";
import ErrorBoundary from "./components/Common/ErrorBoundary";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <AppProvider>
          <PhotosProvider>
            <ViewportSimulatorProvider>
              <App />
            </ViewportSimulatorProvider>
          </PhotosProvider>
        </AppProvider>
      </HashRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
