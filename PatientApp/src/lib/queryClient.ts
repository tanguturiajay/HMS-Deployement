import { QueryClient } from "@tanstack/react-query";
import { installQueryLogger } from "./queryLogger";

// How long server data is treated as fresh shared with useRefetchOnFocusIfStale so on focus refetches use the same window
export const DEFAULT_STALE_TIME = 60 * 1000;

// Shared query client that caches and dedupes server data across screens so navigating back does not refire the request
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: DEFAULT_STALE_TIME, // treat data as fresh for 60s (dedupes focus refetches)
      gcTime: 5 * 60 * 1000, // drop inactive (unobserved) data 5 min after last use
      retry: 1,
      refetchOnWindowFocus: false, // RN: focus refetch is handled explicitly per screen
    },
  },
});

// Dev-only: log network fetches + durations so caching/dedup is observable.
installQueryLogger(queryClient);
