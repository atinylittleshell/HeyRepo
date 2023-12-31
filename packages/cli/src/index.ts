import { Command } from 'commander';
import { readFileSync } from 'fs';
import path from 'path';
import updateNofier from 'update-notifier';
import { fileURLToPath } from 'url';

import { ProgramContext } from './ProgramContext.js';
import { RequestContext } from './RequestContext.js';

const packageJson = JSON.parse(
  readFileSync(
    path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../package.json',
    ),
    'utf-8',
  ),
);

export const main = () => {
  const program = new Command();

  program
    .version(packageJson.version)
    .option('-d --debug', 'output extra debugging information', false)
    .option(
      '-n --new',
      'start a new session, clearing existing conversational context',
      false,
    )
    .argument('<prompts...>', 'Ask what you want')
    .action(
      async (_prompts: string[], options: Record<string, string | boolean>) => {
        updateNofier({
          pkg: packageJson,
          updateCheckInterval: 1000 * 60 * 60, // 1 hour cooldown
        }).notify();

        await ProgramContext.instance.initializeAsync(
          options.debug ? true : false,
        );

        const request = new RequestContext();
        await request.runAsync(
          process.cwd(),
          _prompts.join(' '),
          options.new ? true : false,
        );
      },
    );

  program.parse(process.argv);
};
