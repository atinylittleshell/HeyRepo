import chalk from 'chalk';
import { Command } from 'commander';
import figlet from 'figlet';
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

export const printAsciiArtAsync = (text: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    figlet(text, (err, data) => {
      if (err) {
        reject(err);
        return;
      }

      if (data) {
        console.log(chalk.yellow(data));
        resolve();
      }
    });
  });
};

export const main = () => {
  const program = new Command();

  program
    .version(packageJson.version)
    .option('-d --debug', 'output extra debugging information', false)
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
        await request.runAsync(process.cwd(), _prompts.join(' '));
      },
    );

  program.parse(process.argv);
};
