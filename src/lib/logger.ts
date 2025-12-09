/**
 * Centralized logging utility
 * Provides consistent logging across the application with levels
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  component?: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;

  private log(level: LogLevel, message: string, context?: LogContext) {
    if (!this.isDevelopment && level === 'debug') {
      return; // Skip debug logs in production
    }

    const timestamp = new Date().toISOString();
    const contextStr = context 
      ? `[${context.component || 'App'}${context.action ? `:${context.action}` : ''}]` 
      : '';
    
    const fullMessage = `${timestamp} ${contextStr} ${message}`;

    switch (level) {
      case 'debug':
        console.log(fullMessage, context?.metadata || '');
        break;
      case 'info':
        console.info(fullMessage, context?.metadata || '');
        break;
      case 'warn':
        console.warn(fullMessage, context?.metadata || '');
        break;
      case 'error':
        console.error(fullMessage, context?.metadata || '');
        break;
    }
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error | unknown, context?: LogContext) {
    const metadata = {
      ...context?.metadata,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    };
    this.log('error', message, { ...context, metadata });
  }
}

export const logger = new Logger();
