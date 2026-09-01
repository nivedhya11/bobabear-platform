import type { LogLevel } from "../config/types";
import { redactLogObject } from "./redact-log";

const LOG_LEVEL_RANK: Readonly<Record<LogLevel, number>> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export type StructuredLogEvent = Readonly<Record<string, unknown>>;

export type StructuredLogger = Readonly<{
  log(level: LogLevel, event: StructuredLogEvent): void;
  debug(event: StructuredLogEvent): void;
  info(event: StructuredLogEvent): void;
  warn(event: StructuredLogEvent): void;
  error(event: StructuredLogEvent): void;
}>;

export type CreateStructuredLoggerOptions = Readonly<{
  logLevel: LogLevel;
  allowFields: readonly string[];
  service?: string;
}>;

function shouldLog(configured: LogLevel, message: LogLevel): boolean {
  return LOG_LEVEL_RANK[message] >= LOG_LEVEL_RANK[configured];
}

function pickAllowlistedFields(
  event: StructuredLogEvent,
  allowFields: readonly string[],
): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const field of allowFields) {
    if (field in event && event[field] !== undefined) {
      safe[field] = event[field];
    }
  }
  return safe;
}

export function createStructuredLogger(
  options: CreateStructuredLoggerOptions,
): StructuredLogger {
  const { logLevel, allowFields, service } = options;

  const emit = (level: LogLevel, event: StructuredLogEvent): void => {
    if (!shouldLog(logLevel, level)) return;
    const payload = {
      level,
      ...(service ? { service } : {}),
      ...(redactLogObject(pickAllowlistedFields(event, allowFields)) as Record<string, unknown>),
      timestamp: new Date().toISOString(),
    };
    console.log(JSON.stringify(payload));
  };

  return {
    log: emit,
    debug: (event) => emit("debug", event),
    info: (event) => emit("info", event),
    warn: (event) => emit("warn", event),
    error: (event) => emit("error", event),
  };
}

/** Standard safe HTTP request log fields shared across Node services. */
export const STANDARD_HTTP_LOG_FIELDS = [
  "requestId",
  "operation",
  "safeOutcomeCode",
  "httpStatus",
  "durationMs",
] as const;
