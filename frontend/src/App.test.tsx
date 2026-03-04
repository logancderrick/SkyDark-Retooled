import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppProvider } from "./contexts/AppContext";
import { PhotosProvider } from "./contexts/PhotosContext";
import { ViewportSimulatorProvider } from "./contexts/ViewportSimulatorContext";
import App from "./App";

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <MemoryRouter initialEntries={["/calendar"]}>
      <AppProvider>
        <PhotosProvider>
          <ViewportSimulatorProvider>{children}</ViewportSimulatorProvider>
        </PhotosProvider>
      </AppProvider>
    </MemoryRouter>
  );
}

describe("App", () => {
  it("renders main layout and navigation", async () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>
    );
    await waitFor(() => {
      expect(screen.getByRole("main")).toBeDefined();
    });
  });
});
