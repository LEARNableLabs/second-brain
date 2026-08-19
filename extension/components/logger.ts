interface LogFn {
  (obj: Record<string, unknown>, msg?: string): void;
  (msg: string): void;
}

interface Logger {
  info: LogFn;
  warn: LogFn;
  error: LogFn;
  debug: LogFn;
}

export function createModuleLogger(name: string): Logger {
  const prefix = `[${name}]`;

  const wrap = (level: 'log' | 'warn' | 'error' | 'debug'): LogFn => {
    return (...args: any[]) => {
      if (typeof args[0] === 'string') {
        console[level](`${prefix} ${args[0]}`);
      } else {
        console[level](prefix, args[0], args[1] ?? '');
      }
    };
  };

  return {
    info: wrap('log'),
    warn: wrap('warn'),
    error: wrap('error'),
    debug: wrap('debug'),
  };
}
