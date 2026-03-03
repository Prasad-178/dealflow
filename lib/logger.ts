type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MIN_LEVEL = (process.env.LOG_LEVEL as LogLevel) || "info";

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[MIN_LEVEL];
}

function formatLog(level: LogLevel, module: string, message: string, data?: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    module,
    message,
    ...data,
  };
  return JSON.stringify(entry);
}

function createLogger(module: string) {
  return {
    debug(message: string, data?: Record<string, unknown>) {
      if (shouldLog("debug")) console.debug(formatLog("debug", module, message, data));
    },
    info(message: string, data?: Record<string, unknown>) {
      if (shouldLog("info")) console.info(formatLog("info", module, message, data));
    },
    warn(message: string, data?: Record<string, unknown>) {
      if (shouldLog("warn")) console.warn(formatLog("warn", module, message, data));
    },
    error(message: string, data?: Record<string, unknown>) {
      if (shouldLog("error")) console.error(formatLog("error", module, message, data));
    },
  };
}

export const logger = {
  create: createLogger,
};
