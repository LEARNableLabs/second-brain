import pino from 'pino';

const rootLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
});

export function createModuleLogger(name: string) {
  return rootLogger.child({ module: name });
}

export function createRequestLogger(name: string, requestId: string) {
  return rootLogger.child({ module: name, requestId, traceContext: requestId });
}
