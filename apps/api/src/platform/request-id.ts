import { randomUUID } from "node:crypto";

/** The one place a request id is made: a random source belongs in platform. */
export const generateRequestId = (): string => randomUUID();