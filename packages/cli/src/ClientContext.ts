import { input } from '@inquirer/prompts';
import appDirs from 'appdirsjs';
import fs, { mkdirSync } from 'fs';
import { OpenAI } from 'openai';
import path from 'path';

import { ProgramContext } from './ProgramContext.js';
import { print } from './utils.js';

export type ClientRepoHistory = {
  lastRequestTimestamp: number;
  oaiAssistantId?: string;
  oaiThreadId?: string;
};

type ClientData = {
  oaiKey?: string;
  repoHistory: Record<string, ClientRepoHistory>;
};

export class ClientContext {
  private readonly clientDataFile: string;
  private _clientData: ClientData = {
    repoHistory: {},
  };
  private _oaiClient: OpenAI | null = null;

  constructor() {
    const dirs = appDirs.default({ appName: 'heyrepo' });
    mkdirSync(dirs.data, { recursive: true });
    this.clientDataFile = path.join(dirs.data, 'client.json');
  }

  public async initializeAsync() {
    if (fs.existsSync(this.clientDataFile)) {
      const clientData = JSON.parse(
        fs.readFileSync(this.clientDataFile, 'utf-8'),
      ) as ClientData;

      this._clientData = {
        oaiKey: clientData.oaiKey ?? undefined,
        repoHistory: clientData.repoHistory ?? {},
      };

      ProgramContext.log('verbose', 'client data loaded from file');
    }

    if (!this._clientData.oaiKey) {
      this._clientData.oaiKey = await this.askForOpenAiKeyAsync();
    }

    this.flushClientDataAsync();
  }

  public get openAiKey(): string {
    if (!this._clientData.oaiKey) {
      throw new Error('client context not initialized');
    }
    return this._clientData.oaiKey;
  }

  public get openAiClient(): OpenAI {
    if (!this._oaiClient) {
      this._oaiClient = new OpenAI({ apiKey: this.openAiKey });
    }
    return this._oaiClient;
  }

  public recordRepoUsage(
    repoRoot: string,
    assistantId: string,
    threadId: string,
  ) {
    if (!this._clientData.repoHistory[repoRoot]) {
      this._clientData.repoHistory[repoRoot] = {
        lastRequestTimestamp: 0,
      };
    }
    this._clientData.repoHistory[repoRoot].lastRequestTimestamp = Date.now();
    this._clientData.repoHistory[repoRoot].oaiAssistantId = assistantId;
    this._clientData.repoHistory[repoRoot].oaiThreadId = threadId;
    this.flushClientDataAsync();
  }

  public getRepoHistory(repoRoot: string): ClientRepoHistory | null {
    if (!this._clientData.repoHistory[repoRoot]) {
      return null;
    }

    return { ...this._clientData.repoHistory[repoRoot] };
  }

  private async flushClientDataAsync() {
    fs.writeFileSync(this.clientDataFile, JSON.stringify(this._clientData), {
      encoding: 'utf-8',
    });

    ProgramContext.log(
      'verbose',
      `client data saved to file: ${JSON.stringify(this._clientData)}`,
    );
  }

  private async askForOpenAiKeyAsync(): Promise<string> {
    print(
      'chat',
      "Hello there! Looks like I'm helping you for the first time. I use OpenAI behind the scenes and will need an OpenAI API key to work. This key will be stored on your local machine only.",
    );

    const key = await input({
      message: 'Enter OpenAI API key here:',
      validate: (key) => {
        if (!key) {
          return 'Please enter a valid OpenAI API key:';
        }

        return true;
      },
    });

    return key.trim();
  }
}
