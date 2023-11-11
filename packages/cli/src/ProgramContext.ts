import ora, { Ora } from 'ora';

import { Logger, LogLevel } from './Logger.js';

export class ProgramContext {
  private static _instance: ProgramContext | null = null;

  public static get instance(): ProgramContext {
    if (!ProgramContext._instance) {
      ProgramContext._instance = new ProgramContext();
    }
    return ProgramContext._instance;
  }

  private constructor() {}

  private _debugMode = false;
  public get debugMode(): boolean {
    return this._debugMode;
  }

  private _logger: Logger | null = null;
  public get logger(): Logger {
    if (!this._logger) {
      throw new Error('program context not initialized');
    }
    return this._logger;
  }

  private _spinner: Ora | null = null;
  public get spinner(): Ora {
    if (!this._spinner) {
      throw new Error('program context not initialized');
    }
    return this._spinner;
  }

  public async initializeAsync(debugMode: boolean) {
    this._debugMode = debugMode;
    this._logger = new Logger(debugMode ? 'debug' : 'warn');
    this._spinner = ora({
      text: 'Thinking...',
      color: 'blue',
      spinner: 'squareCorners',
    });
  }

  public static log(level: LogLevel, message: string) {
    ProgramContext.instance.logger.log(level, message);
  }
}
