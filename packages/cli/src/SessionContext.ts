import { ClientContext } from './ClientContext.js';
import { ProgramContext } from './ProgramContext.js';
import { RepoContext } from './RepoContext.js';

const SESSION_EXPIRATION = 1000 * 60 * 60 * 24 * 3; // 3 days

export class SessionContext {
  private _client: ClientContext | null = null;
  private _repo: RepoContext | null = null;
  private _threadId: string | null = null;

  public get client() {
    if (!this._client) {
      throw new Error('session context not initialized');
    }
    return this._client;
  }

  public get repo() {
    if (!this._repo) {
      throw new Error('session context not initialized');
    }
    return this._repo;
  }

  public get threadId() {
    if (!this._threadId) {
      throw new Error('session context not initialized');
    }
    return this._threadId;
  }

  public async initializeAsync(
    client: ClientContext,
    repo: RepoContext,
    newSession: boolean,
  ) {
    this._client = client;
    this._repo = repo;

    if (!newSession) {
      const history = this._client.getRepoHistory(this._repo.repoRoot);
      if (history && history.oaiThreadId) {
        if (Date.now() - history.lastRequestTimestamp > SESSION_EXPIRATION) {
          ProgramContext.log(
            'verbose',
            'found a saved session but it has expired.',
          );
        } else {
          this._threadId = history.oaiThreadId;

          ProgramContext.log(
            'verbose',
            `using last used thread id ${this._threadId}`,
          );
        }
      }
    }

    if (!this._threadId) {
      ProgramContext.log(
        'verbose',
        newSession
          ? 'start a new thread as specified'
          : 'no previous thread id found. creating a new one.',
      );

      const thread = await this.client.openAiClient.beta.threads.create();
      this._threadId = thread.id;

      ProgramContext.log(
        'verbose',
        `new thread created ${JSON.stringify(thread)}`,
      );
    }
  }
}
