export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export class Logger {
  private static level: LogLevel = LogLevel.INFO;

  public static setLevel(level: LogLevel): void {
    this.level = level;
  }

  public static debug(message: string, ...meta: any[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`, ...meta);
    }
  }

  public static info(message: string, ...meta: any[]): void {
    if (this.level <= LogLevel.INFO) {
      console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...meta);
    }
  }

  public static warn(message: string, ...meta: any[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...meta);
    }
  }

  public static error(message: string, ...meta: any[]): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, ...meta);
    }
  }
}
