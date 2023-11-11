import fs from 'fs-extra';
import path from 'path';

import { ProgramContext } from '../ProgramContext.js';
import { print } from '../utils.js';

export type WriteFileOutput = {
  success?: boolean;
  error?: string;
};

export async function writeFile(
  repoRoot: string,
  file: string,
  content: string,
): Promise<WriteFileOutput> {
  print('process', `writing file ${file}...`);

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
  if (fs.existsSync(absolutePath) && fs.lstatSync(absolutePath).isDirectory()) {
    return {
      error: 'specified path already exists and is a directory',
    };
  }

  try {
    await fs.writeFile(absolutePath, content, 'utf8');

    return { success: true };
  } catch (err) {
    ProgramContext.log('error', `unable to write file ${absolutePath}: ${err}`);
    return {
      error: 'unable to write file',
    };
  }
}
