import fs from 'fs-extra';
import * as istextorbinary from 'istextorbinary';
import path from 'path';

import { ProgramContext } from '../ProgramContext.js';
import { print } from '../utils.js';

export type ReadFileOutput = {
  error?: string;
  content?: string;
};

export async function readFile(
  repoRoot: string,
  file: string,
): Promise<ReadFileOutput> {
  print('process', `reading file ${file}...`);

  if (!file.startsWith('/')) {
    return {
      error: 'all file paths must start with /',
    };
  }

  const relativePath = path.normalize('.' + file.replaceAll('/', path.sep));
  const absolutePath = path.join(repoRoot, relativePath);

  if (!absolutePath.startsWith(repoRoot)) {
    return {
      error: 'cannot read files outside of the repo',
    };
  }
  if (!fs.existsSync(absolutePath)) {
    return {
      error: 'specified file does not exist',
    };
  }
  if (!fs.lstatSync(absolutePath).isFile()) {
    return {
      error: 'specified path is not a file',
    };
  }

  try {
    const data = await fs.readFile(absolutePath);

    const fileName = path.basename(absolutePath);
    if (istextorbinary.isText(fileName, data)) {
      return {
        content: data.toString(),
      };
    } else {
      ProgramContext.log('warn', `cannot read binary file: ${relativePath}`);
      return {
        error: 'cannot read binary file',
      };
    }
  } catch (err) {
    ProgramContext.log('error', `unable to read file ${absolutePath}: ${err}`);
    return {
      error: 'unable to read file',
    };
  }
}
