import { input } from '@inquirer/prompts';
import fs from 'fs';
import path from 'path';

import { ClientContext } from './ClientContext.js';
import { ProgramContext } from './ProgramContext.js';
import { RequestContext } from './RequestContext.js';

export class RepoContext {
  private _repoRoot: string | null = null;
  private _assistantId: string | null = null;
  private _client: ClientContext | null = null;

  public get repoRoot(): string {
    if (!this._repoRoot) {
      throw new Error('repo context not initialized');
    }
    return this._repoRoot;
  }

  public get assistantId(): string {
    if (!this._assistantId) {
      throw new Error('repo context not initialized');
    }
    return this._assistantId;
  }

  public get client(): ClientContext {
    if (!this._client) {
      throw new Error('repo context not initialized');
    }
    return this._client;
  }

  public async initializeAsync(
    workingDirectory: string,
    client: ClientContext,
  ) {
    this._client = client;

    this.locateRepoRootWithTargetDir(workingDirectory, '.heyrepo');
    if (!this._repoRoot) {
      ProgramContext.log(
        'verbose',
        "couldn't find .heyrepo in any parent directory",
      );

      this.locateRepoRootWithTargetDir(workingDirectory, '.git');
    } else {
      ProgramContext.log('verbose', `found .heyrepo at ${this._repoRoot}}`);
    }

    // if no repo root is found, ask for user input for where the root is
    if (!this._repoRoot) {
      ProgramContext.log(
        'verbose',
        "couldn't find .git in any parent directory",
      );

      await this.askForRepoRootAsync(workingDirectory);
    } else {
      ProgramContext.log('verbose', `found .git at ${this._repoRoot}}`);
    }

    const history = client.getRepoHistory(this._repoRoot!);
    if (history) {
      ProgramContext.log(
        'verbose',
        'using last used assistant id for the repo',
      );

      this._assistantId = history.oaiAssistantId || null;
    }
    if (!this._assistantId) {
      ProgramContext.log(
        'verbose',
        'no used assistant id found for this repo, creating new one',
      );

      const dummyRequestContext = new RequestContext();
      const functionSchema = dummyRequestContext.getSchema();
      if (!functionSchema) {
        ProgramContext.log('error', 'unexpected null function schema');
        throw new Error('unexpected null function schema');
      }

      const assistant = await this._client.openAiClient.beta.assistants.create({
        name: 'HeyRepo',
        instructions:
          'You are a CLI tool for doing tasks in a code repository using the functions given to you. The repo is mounted at the root "/" directory.',
        tools: functionSchema.map((f) => ({
          type: 'function',
          function: f,
        })),
        model: 'gpt-4-1106-preview',
      });
      this._assistantId = assistant.id;

      ProgramContext.log(
        'verbose',
        `new assistant created with id ${this._assistantId}`,
      );
    }
  }

  private async askForRepoRootAsync(workingDirectory: string) {
    const userInput = await input({
      message:
        'Oops - I cannot locate a repo. What should I use as the root directory?',
      default: workingDirectory,
      validate: (p) => {
        if (!path.isAbsolute(p)) {
          return 'Specified path must be absolute. Try again?';
        }
        if (!fs.existsSync(p)) {
          return 'Specified path does not exist. Try again?';
        }

        if (!fs.lstatSync(p).isDirectory()) {
          return 'Specified path is not a directory. Try again?';
        }

        return true;
      },
    });

    this._repoRoot = path.normalize(userInput);
  }

  private locateRepoRootWithTargetDir(
    workingDirectory: string,
    targetDir: string,
  ) {
    // from workingDirectory to all parent directories recursively,
    // find the first directory that contains a .git folder and
    // set that as the root of the repo
    let currentDirectory = workingDirectory;
    while (!this._repoRoot) {
      if (fs.existsSync(targetDir) && fs.lstatSync(targetDir).isDirectory()) {
        this._repoRoot = currentDirectory;
        break;
      }

      const parentDirectory = path.dirname(currentDirectory);
      if (parentDirectory === currentDirectory) {
        // we've reached the root of the filesystem
        break;
      }
      currentDirectory = parentDirectory;
    }
  }
}
