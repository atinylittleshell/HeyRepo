import appDirs from 'appdirsjs';
import dayjs from 'dayjs';
import EventEmitter from 'events';
import path from 'path';
import winston from 'winston';

export type LogLevel = 'debug' | 'verbose' | 'info' | 'warn' | 'error';

export class Logger extends EventEmitter {
  private logPath: string;
  private winstonLogger: winston.Logger;

  public constructor(consoleLogLevel: LogLevel = 'warn') {
    super();

    const logFormat = winston.format.combine(
      winston.format.timestamp({
        format: () => {
          return dayjs().format('YYYY-MM-DD HH:mm:ss.SSS');
        },
      }),
    );

    const dirs = appDirs.default({ appName: 'heyrepo' });
    this.logPath = path.join(dirs.data, 'logs.log');
    this.winstonLogger = winston.createLogger({
      format: logFormat,
      transports: [
        new winston.transports.File({
          level: 'debug',
          filename: this.logPath,
          format: winston.format.combine(logFormat, winston.format.json()),
        }),
        new winston.transports.Console({
          level: consoleLogLevel,
          format: winston.format.combine(
            winston.format.colorize(),
            logFormat,
            winston.format.printf((log) => {
              return `[${log.level}][${log.timestamp}] ${log.message}`;
            }),
          ),
        }),
      ],
    });
  }

  log(level: LogLevel, message: string): void {
    this.winstonLogger.log(level, message);
    this.emit('log', level, message);
  }

  getLogPath(): string {
    return this.logPath;
  }
}
