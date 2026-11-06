import { NotFoundException, type ArgumentsHost } from "@nestjs/common";
import type { ErrorFilter, RequestLike, ResponseLike } from "./error.filter.js";

/** Express middleware for paths nothing matched. It hands a 404 to the one filter, so the envelope, request id and log line match every other error. */
export function createNotFoundHandler(filter: ErrorFilter) {
  return (req: RequestLike, res: ResponseLike): void => {
    const host = {
      switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
    } as unknown as ArgumentsHost;
    filter.catch(new NotFoundException(), host);
  };
}