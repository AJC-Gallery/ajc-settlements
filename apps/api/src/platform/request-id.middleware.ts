import { REQUEST_ID_HEADER, resolveRequestId } from "../common/request-id.js";

/** The few request members the middleware touches. The filter reads `requestId` back. */
export interface IncomingLike {
  readonly headers: Readonly<Record<string, string | readonly string[] | undefined>>;
  requestId?: string;
}

export interface OutgoingLike {
  setHeader(name: string, value: string): unknown;
}

/** Keeps a well-formed incoming id, otherwise makes one. Same id in logs and error bodies (P-13). */
export function createRequestIdMiddleware(generate: () => string) {
  return (req: IncomingLike, res: OutgoingLike, next: () => void): void => {
    const id = resolveRequestId(req.headers[REQUEST_ID_HEADER], generate);
    req.requestId = id;
    res.setHeader(REQUEST_ID_HEADER, id);
    next();
  };
}