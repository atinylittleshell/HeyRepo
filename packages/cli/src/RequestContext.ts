import chalk from 'chalk';
import cliSpinners from 'cli-spinners';
import { FunctionCallingProvider, gptFunction, gptString } from 'function-gpt';
import ora from 'ora';

import { ClientContext } from './ClientContext.js';
import { ls, LsOutput } from './functions/ls.js';
import { readFile, ReadFileOutput } from './functions/readFile.js';
import { writeFile, WriteFileOutput } from './functions/writeFile.js';
import { ProgramContext } from './ProgramContext.js';
import { RepoContext } from './RepoContext.js';
import { SessionContext } from './SessionContext.js';

class LsArgs {
  @gptString('current directory')
  public dir!: string;
}

class ReadFileArgs {
  @gptString('path of the file to read')
  public file!: string;
}

class WriteFileArgs {
  @gptString('path of the file to write')
  public file!: string;

  @gptString('content to write to the file')
  public content!: string;
}

const EXPO_BACKOFF_INITIAL = 500;
const EXPO_BACKOFF_MAX = 60000;

export class RequestContext extends FunctionCallingProvider {
  public readonly client: ClientContext;
  public readonly repo: RepoContext;
  public readonly session: SessionContext;

  constructor() {
    super();

    this.client = new ClientContext();
    this.repo = new RepoContext();
    this.session = new SessionContext();
  }

  public async runAsync(
    workDirectory: string,
    prompt: string,
    newSession: boolean,
  ) {
    await this.client.initializeAsync();
    await this.repo.initializeAsync(workDirectory, this.client);
    await this.session.initializeAsync(this.client, this.repo, newSession);

    const spinner = ora({
      text: 'Thinking...',
      color: 'blue',
      spinner: cliSpinners.squareCorners,
    });
    spinner.start();

    const threadId = this.session.threadId;
    await this.client.openAiClient.beta.threads.messages.create(threadId, {
      role: 'user',
      content: prompt,
    });

    let run = await this.client.openAiClient.beta.threads.runs.create(
      threadId,
      {
        assistant_id: this.repo.assistantId,
      },
    );

    ProgramContext.log('verbose', `new run created: ${JSON.stringify(run)}`);

    this.client.recordRepoUsage(
      this.repo.repoRoot,
      this.repo.assistantId,
      threadId,
    );

    let failed = false;
    const printedMessages: Record<string, string> = {};
    let retryBackoff = EXPO_BACKOFF_INITIAL;
    let lastStatus = 'queued';

    while (run.status !== 'completed' && !failed) {
      // the reason we make a closure here is that it's hard to type the input
      // parameters since OpenAI SDK didn't export proper typing here
      const submitRequiredActionAsync = async () => {
        if (!run.required_action) {
          return;
        }

        const allOutputs = await Promise.all(
          run.required_action.submit_tool_outputs.tool_calls.map(
            async (toolCall) => {
              if (toolCall.type !== 'function') {
                throw new Error('unexpected tool call type');
              }

              ProgramContext.log(
                'verbose',
                `handling function call: ${toolCall.function.name}(${toolCall.function.arguments})`,
              );
              const output = await this.handleFunctionCalling(
                toolCall.function.name,
                toolCall.function.arguments,
              );
              ProgramContext.log(
                'verbose',
                `function call output: ${JSON.stringify(output)}`,
              );

              return {
                tool_call_id: toolCall.id,
                output: JSON.stringify(output),
              };
            },
          ),
        );

        await this.client.openAiClient.beta.threads.runs.submitToolOutputs(
          threadId,
          run.id,
          {
            tool_outputs: allOutputs,
          },
        );
      };

      ProgramContext.log('verbose', `run status: ${run.status}`);

      switch (run.status) {
        case 'queued':
        case 'in_progress':
          break;
        case 'requires_action':
          await submitRequiredActionAsync();
          break;
        default:
          // failed somehow
          failed = true;
          break;
      }

      await new Promise((resolve) => setTimeout(resolve, retryBackoff));

      run = await this.client.openAiClient.beta.threads.runs.retrieve(
        threadId,
        run.id,
      );

      if (run.status === lastStatus) {
        retryBackoff = Math.min(retryBackoff * 2, EXPO_BACKOFF_MAX);
      } else {
        retryBackoff = EXPO_BACKOFF_INITIAL;
      }
      lastStatus = run.status;

      const messages =
        await this.client.openAiClient.beta.threads.messages.list(threadId);

      [...messages.getPaginatedItems()]
        .sort((a, b) => {
          return a.created_at - b.created_at;
        })
        .filter((message) => message.role === 'assistant')
        .flatMap((message) =>
          message.content.map((i) => ({
            id: message.id,
            content: i,
          })),
        )
        .forEach((message) => {
          if (message.content.type !== 'text' || !message.content.text.value) {
            return;
          }

          if (printedMessages[message.id] === message.content.text.value) {
            return;
          }

          spinner.stop();

          ProgramContext.log(
            'info',
            `ASSISTANT: ${message.content.text.value}`,
          );
          console.log(chalk.blue(message.content.text.value));

          spinner.start();

          printedMessages[message.id] = message.content.text.value;
        });
    }

    spinner.stop();

    if (failed) {
      console.log(
        chalk.red("Sorry I couldn't figure out how to help you with that."),
      );
    } else {
      console.log(
        chalk.green(
          "Work done! I'm glad I could help you with that. Have a nice day!",
        ),
      );
    }
  }

  @gptFunction(
    'list files and directories directly in the current directory',
    LsArgs,
  )
  public async ls(args: LsArgs): Promise<LsOutput> {
    return await ls(this.repo.repoRoot, args.dir);
  }

  @gptFunction('read the content of a file in the repo', ReadFileArgs)
  public async readFile(args: ReadFileArgs): Promise<ReadFileOutput> {
    return await readFile(this.repo.repoRoot, args.file);
  }

  @gptFunction('write to a file in the repo', WriteFileArgs)
  public async writeFile(args: WriteFileArgs): Promise<WriteFileOutput> {
    return await writeFile(this.repo.repoRoot, args.file, args.content);
  }
}
