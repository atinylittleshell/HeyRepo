import chalk from 'chalk';
import { Command } from 'commander';
import figlet from 'figlet';
import { readFileSync } from 'fs';
import path from 'path';
import updateNofier from 'update-notifier';
import { fileURLToPath } from 'url';

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
        // eslint-disable-next-line no-console
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
    .argument('<prompts...>', 'Ask what you want')
    .action(
      async (
        _prompts: string[],
        _options: Record<string, string | boolean>,
      ) => {
        updateNofier({
          pkg: packageJson,
          updateCheckInterval: 1000 * 60 * 60, // 1 hour cooldown
        }).notify();

        await printAsciiArtAsync('HEY REPO');
      },
    );

  program.parse(process.argv);
};
