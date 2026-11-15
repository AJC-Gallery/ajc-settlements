import type { Logger } from "./logger.js";
import { ipClassOf, xffCountOf } from "./proxy-probe.js";

export interface ProbeRequest {
  readonly headers: Readonly<Record<string, string | readonly string[] | undefined>>;
  readonly ip?: string;
  readonly requestId?: string;
}

/** One debug line per request: how many hops the API sees and what req.ip becomes. No addresses. */
export function createProxyProbe(logger: Logger) {
  return (req: ProbeRequest, _res: unknown, next: () => void): void => {
    logger.debug("proxy probe", {
      requestId: req.requestId,
      xffCount: xffCountOf(req.headers["x-forwarded-for"]),
      ipClass: ipClassOf(req.ip),
    });
    next();
  };
}