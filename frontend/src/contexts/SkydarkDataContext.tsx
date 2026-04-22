/**
 * Provides HA WebSocket-backed SkyDark data (events, tasks, lists, family, config)
 * and refetch/mutation helpers. Wrap app so views and AppContext can consume it.
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useSkydarkData } from "../hooks/useSkydarkData";
import type { SkydarkDataState } from "../hooks/useSkydarkData";

interface SkydarkDataContextValue {
  data: SkydarkDataState;
  refetch: () => Promise<void>;
  refetchEvents: (startDate?: string, endDate?: string) => Promise<void>;
  refetchLists: () => Promise<void>;
}

const SkydarkDataContext = createContext<SkydarkDataContextValue | null>(null);

export function SkydarkDataProvider({ children }: { children: ReactNode }) {
  const { data, refetch, refetchEvents, refetchLists } = useSkydarkData();
  const value = useMemo(
    () => ({ data, refetch, refetchEvents, refetchLists }),
    [data, refetch, refetchEvents, refetchLists],
  );
  return <SkydarkDataContext.Provider value={value}>{children}</SkydarkDataContext.Provider>;
}

export function useSkydarkDataContext(): SkydarkDataContextValue | null {
  return useContext(SkydarkDataContext);
}
