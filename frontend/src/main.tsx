import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { AppProvider } from "./contexts/AppContext";
import { SkydarkDataProvider } from "./contexts/SkydarkDataContext";
import { PhotosProvider } from "./contexts/PhotosContext";
import { ViewportSimulatorProvider } from "./contexts/ViewportSimulatorContext";
import ErrorBoundary from "./components/Common/ErrorBoundary";
import App from "./App";
import "./index.css";

const rootEl = document.getElementById("root");
if (!rootEl) {
  document.body.innerHTML =
    "<div style=\"display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;padding:2rem;text-align:center;\"><h2>SkyDark: missing root element</h2><p>This app expects a <code>#root</code> element. Check that the correct HTML is being served.</p></div>";
} else {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <ErrorBoundary>
        <HashRouter>
          <SkydarkDataProvider>
            <AppProvider>
              <PhotosProvider>
              <ViewportSimulatorProvider>
                <App />
              </ViewportSimulatorProvider>
            </PhotosProvider>
            </AppProvider>
          </SkydarkDataProvider>
        </HashRouter>
      </ErrorBoundary>
    </React.StrictMode>
  );
}
