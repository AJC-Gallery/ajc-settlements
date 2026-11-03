import { QueryClient } from "@tanstack/react-query";
import { ApiError, isRetryable } from "./api-error";

/** Extra attempts for a failed read. Writes are never retried by the library: a person retries them, with the same key. */
export const MAX_QUERY_RETRIES = 2;

export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  return error instanceof ApiError && isRetryable(error.failure) && failureCount < MAX_QUERY_RETRIES;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: shouldRetryQuery },
      mutations: { retry: false },
    },
  });
}
