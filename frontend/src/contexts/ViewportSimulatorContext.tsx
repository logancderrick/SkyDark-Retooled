/**
 * Viewport simulator state for tablet testing. Persisted in localStorage.
 * Client-only; read on mount, persist on change.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { Orientation } from "../lib/viewportPresets";
import { VIEWPORT_PRESETS } from "../lib/viewportPresets";

const STORAGE_KEY = "skydark_viewport_simulator";

export interface ViewportSimulatorState {
  developerMode: boolean;
  presetId: string;
  orientation: Orientation;
  showSafeArea: boolean;
  showGrid: boolean;
}

const DEFAULT_STATE: ViewportSimulatorState = {
  developerMode: false,
  presetId: "10in",
  orientation: "landscape",
  showSafeArea: false,
  showGrid: false,
};

function loadState(): ViewportSimulatorState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ViewportSimulatorState>;
      const presetId =
        VIEWPORT_PRESETS.some((p) => p.id === parsed.presetId) ? parsed.presetId! : DEFAULT_STATE.presetId;
      return {
        developerMode: typeof parsed.developerMode === "boolean" ? parsed.developerMode : DEFAULT_STATE.developerMode,
        presetId,
        orientation:
          parsed.orientation === "portrait" || parsed.orientation === "landscape"
            ? parsed.orientation
            : DEFAULT_STATE.orientation,
        showSafeArea: typeof parsed.showSafeArea === "boolean" ? parsed.showSafeArea : DEFAULT_STATE.showSafeArea,
        showGrid: typeof parsed.showGrid === "boolean" ? parsed.showGrid : DEFAULT_STATE.showGrid,
      };
    }
  } catch {
    // ignore
  }
  return DEFAULT_STATE;
}

interface ViewportSimulatorContextValue extends ViewportSimulatorState {
  setDeveloperMode: (value: boolean) => void;
  setPresetId: (value: string) => void;
  setOrientation: (value: Orientation) => void;
  setShowSafeArea: (value: boolean) => void;
  setShowGrid: (value: boolean) => void;
  resetToRealDevice: () => void;
}

const ViewportSimulatorContext = createContext<ViewportSimulatorContextValue | null>(null);

export function ViewportSimulatorProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ViewportSimulatorState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state, hydrated]);

  const setDeveloperMode = useCallback((developerMode: boolean) => {
    setState((s) => ({ ...s, developerMode }));
  }, []);

  const setPresetId = useCallback((presetId: string) => {
    if (!VIEWPORT_PRESETS.some((p) => p.id === presetId)) return;
    setState((s) => ({ ...s, presetId }));
  }, []);

  const setOrientation = useCallback((orientation: Orientation) => {
    setState((s) => ({ ...s, orientation }));
  }, []);

  const setShowSafeArea = useCallback((showSafeArea: boolean) => {
    setState((s) => ({ ...s, showSafeArea }));
  }, []);

  const setShowGrid = useCallback((showGrid: boolean) => {
    setState((s) => ({ ...s, showGrid }));
  }, []);

  const resetToRealDevice = useCallback(() => {
    setState((s) => ({ ...s, developerMode: false }));
  }, []);

  const value: ViewportSimulatorContextValue = {
    ...state,
    setDeveloperMode,
    setPresetId,
    setOrientation,
    setShowSafeArea,
    setShowGrid,
    resetToRealDevice,
  };

  return (
    <ViewportSimulatorContext.Provider value={value}>
      {children}
    </ViewportSimulatorContext.Provider>
  );
}

export function useViewportSimulator(): ViewportSimulatorContextValue {
  const ctx = useContext(ViewportSimulatorContext);
  if (!ctx) throw new Error("useViewportSimulator must be used within ViewportSimulatorProvider");
  return ctx;
}
