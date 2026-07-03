import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { DEFAULT_STALE_TIME } from "@/lib/queryClient";

// Minimal shape shared by query results that accepts either the whole result or just these three fields
interface RefetchableQuery {
  refetch: () => unknown;
  dataUpdatedAt: number;
  fetchStatus: "fetching" | "paused" | "idle";
}

// Refetches on focus only when the query is not already fetching and either has no data or has gone stale
export function useRefetchOnFocusIfStale(
  query: RefetchableQuery,
  staleMs: number = DEFAULT_STALE_TIME,
): void {
  const { refetch, dataUpdatedAt, fetchStatus } = query;
  useFocusEffect(
    useCallback(() => {
      if (fetchStatus === "fetching") return;
      const hasData = dataUpdatedAt > 0;
      if (!hasData || Date.now() - dataUpdatedAt > staleMs) refetch();
    }, [refetch, dataUpdatedAt, fetchStatus, staleMs]),
  );
}
