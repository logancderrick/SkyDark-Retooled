import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AppProvider } from "./contexts/AppContext";
import { PhotosProvider } from "./contexts/PhotosContext";
import { ViewportSimulatorProvider } from "./contexts/ViewportSimulatorContext";
import App from "./App";
import "./index.css";

const basename = import.meta.env.BASE_URL || "/skydark/";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter basename={basename}>
      <AppProvider>
        <PhotosProvider>
          <ViewportSimulatorProvider>
            <App />
          </ViewportSimulatorProvider>
        </PhotosProvider>
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>
);
