import { redact } from "../common/redact.js";
import { LOG_LEVELS, type LogLevel } from "../config/config.js";

/** JSON logs, one object per line, with redaction applied to every field (P-13). */
export type LogFields = Readonly<Record<string, unknown>>;

export interface LogSink {
  write(line: string): void;
}

export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
  /** A logger whose every line also carries `bindings` (for example the request id). */
  child(bindings: LogFields): Logger;
}

export interface LoggerOptions {
  readonly level: LogLevel;
  readonly sink: LogSink;
  /** Injected so tests are exact (structure rule 4). */
  readonly now: () => Date;
  readonly bindings?: LogFields;
}

/** The real sink. Console output is banned by lint; stdout is what the host collects. */
export const stdoutSink: LogSink = {
  write: (line) => {
    process.stdout.write(line);
  },
};

const severity = (level: LogLevel): number => LOG_LEVELS.indexOf(level);

/** `level`, `time` and `msg` come last, so a caller's field can never overwrite them. */
function formatLine(level: LogLevel, time: Date, message: string, fields: LogFields): string {
  const safe = redact(fields) as Record<string, unknown>;
  return `${JSON.stringify({ ...safe, level, time: time.toISOString(), msg: message })}\n`;
}

export function createLogger(options: LoggerOptions): Logger {
  const bindings = options.bindings ?? {};
  const threshold = severity(options.level);
  const emit = (level: LogLevel, message: string, fields: LogFields = {}): void => {
    if (severity(level) < threshold) return;
    options.sink.write(formatLine(level, options.now(), message, { ...bindings, ...fields }));
  };
  return {
    debug: (message, fields) => emit("debug", message, fields),
    info: (message, fields) => emit("info", message, fields),
    warn: (message, fields) => emit("warn", message, fields),
    error: (message, fields) => emit("error", message, fields),
    child: (extra) => createLogger({ ...options, bindings: { ...bindings, ...extra } }),
  };
}