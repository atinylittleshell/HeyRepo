import chalk from 'chalk';
import cliSpinners from 'cli-spinners';
import { FunctionCallingProvider, gptFunction, gptString } from 'function-gpt';
import ora from 'ora';

import { ClientContext } from './ClientContext.js';
import { ls, lsOutput } from './functions/ls.js';
import { ProgramContext } from './ProgramContext.js';
import { RepoContext } from './RepoContext.js';

class lsArgs {
  @gptString('current directory')
  public dir!: string;
}

export class RequestContext extends FunctionCallingProvider {
  public readonly client: ClientContext;
  public readonly repo: RepoContext;

  constructor() {
    super();

    this.client = new ClientContext();
    this.repo = new RepoContext();
  }

  public async runAsync(workDirectory: string, prompt: string) {
    await this.client.initializeAsync();
    await this.repo.initializeAsync(workDirectory, this.client);

    const spinner = ora({
      text: 'Thinking...\n',
      color: 'blue',
      spinner: cliSpinners.squareCorners,
    }).start();

    const thread = await this.client.openAiClient.beta.threads.create();
    await this.client.openAiClient.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: prompt,
    });

    ProgramContext.log(
      'verbose',
      `new thread created: ${JSON.stringify(thread)}`,
    );

    let run = await this.client.openAiClient.beta.threads.runs.create(
      thread.id,
      {
        assistant_id: this.repo.assistantId,
      },
    );

    ProgramContext.log('verbose', `new run created: ${JSON.stringify(thread)}`);

    this.client.recordRepoUsage(
      this.repo.repoRoot,
      this.repo.assistantId,
      thread.id,
    );

    let failed = false;
    const printedMessageIds = new Set<string>();
    let lastAssistantMessage = '';

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

              return {
                tool_call_id: toolCall.id,
                output: JSON.stringify(output),
              };
            },
          ),
        );

        await this.client.openAiClient.beta.threads.runs.submitToolOutputs(
          thread.id,
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

      // TODO: exponential backoff
      await new Promise((resolve) => setTimeout(resolve, 5000));

      run = await this.client.openAiClient.beta.threads.runs.retrieve(
        thread.id,
        run.id,
      );

      const messages =
        await this.client.openAiClient.beta.threads.messages.list(thread.id);
      [...messages.data]
        .sort((a, b) => {
          return a.created_at - b.created_at;
        })
        .forEach((message) => {
          if (!printedMessageIds.has(message.id)) {
            ProgramContext.log(
              'info',
              `${message.role}: ${JSON.stringify(message.content)}`,
            );
            printedMessageIds.add(message.id);
          }

          if (message.role === 'assistant') {
            message.content.forEach((i) => {
              if (i.type === 'text') {
                lastAssistantMessage = i.text.value;
              }
            });
          }
        });
    }

    spinner.stop();

    if (failed) {
      if (lastAssistantMessage) {
        console.log(chalk.red(lastAssistantMessage));
      } else {
        console.log(
          chalk.red("Sorry I couldn't figure out how to help you with that."),
        );
      }
    } else {
      if (lastAssistantMessage) {
        console.log(lastAssistantMessage);
      } else {
        console.log(
          "Work done! I'm glad I could help you with that. Have a nice day!",
        );
      }
    }
  }

  @gptFunction(
    'list files and directories directly in the current directory',
    lsArgs,
  )
  public async ls(args: lsArgs): Promise<lsOutput> {
    return await ls(this.repo.repoRoot, args.dir);
  }
}
