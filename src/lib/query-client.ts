import { QueryClient } from "@tanstack/react-query";

// Helpers so per-query staleTime is consistent across the app.
export const CACHE_DURATIONS = {
  // Fast-moving data (orders, notifications, dashboards)
  short: 60_000,
  // Default for most queries
  default: 5 * 60_000,
  // Catalog-like data that changes rarely
  long: 30 * 60_000,
  // Static-ish data (collections list, policy text)
  static: 60 * 60_000,
} as const;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: CACHE_DURATIONS.default,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        const status = (error as { status?: number })?.status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      retry: 0,
      gcTime: 0,
    },
  },
});
