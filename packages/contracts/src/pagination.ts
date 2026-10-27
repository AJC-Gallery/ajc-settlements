/** Upper bound on `limit` for every list endpoint (C-08). */
export const MAX_PAGE_LIMIT = 100;

/** `limit` when a list request does not send one. */
export const DEFAULT_PAGE_SIZE = 15;

/** Query string of every list endpoint. Pages count from 1. Both fields are optional. */
export interface PageQuery {
  readonly page?: number;
  readonly limit?: number;
}

/** The one list envelope (C-08). */
export interface PageResponse<T> {
  readonly results: readonly T[];
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
}