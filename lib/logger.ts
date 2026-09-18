// Structured logging for state-changing operations, so failures/changes can be
// diagnosed from logs alone without re-running the code (constitution principle V).
type LogContext = Record<string, string | number | null | undefined>;

function log(level: "info" | "warn" | "error", event: string, context: LogContext) {
  console[level](
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      event,
      ...context,
    }),
  );
}

export const logger = {
  info: (event: string, context: LogContext) => log("info", event, context),
  warn: (event: string, context: LogContext) => log("warn", event, context),
  error: (event: string, context: LogContext) => log("error", event, context),
};
