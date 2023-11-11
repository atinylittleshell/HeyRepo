import chalk from 'chalk';
import figlet from 'figlet';

import { ProgramContext } from './ProgramContext.js';

export type OutputMessageType = 'chat' | 'process' | 'error';

export const print = (type: OutputMessageType, message: string) => {
  ProgramContext.instance.spinner.stop();

  console.log('----------------------------------------');
  switch (type) {
    case 'chat':
      console.log(chalk.blue(message));
      break;
    case 'process':
      console.log(chalk.yellow(message));
      break;
    case 'error':
      console.log(chalk.red(message));
      break;
  }

  ProgramContext.instance.spinner.start();
};

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
