/** Upper bound on `limit` for every list endpoint (C-08). */
export const MAX_PAGE_LIMIT = 100;

/** The one list envelope (C-08). */
export interface PageResponse<T> {
  readonly results: readonly T[];
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
}