/** Opt into React Router v7 behaviors early; silences migration warnings in dev and Vitest. */
export const routerFutureFlags = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
} as const;
