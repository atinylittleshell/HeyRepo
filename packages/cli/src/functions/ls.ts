import fs from 'fs';
import path from 'path';

import { ProgramContext } from '../ProgramContext.js';
import { print } from '../utils.js';

export type FsItem = {
  path: string;
  size: number;
};

export type LsOutput = {
  error?: string;
  files?: FsItem[];
  directories?: FsItem[];
};

export async function ls(repoRoot: string, dir: string): Promise<LsOutput> {
  print('process', `listing files and directories in ${dir}...`);

  if (!dir.startsWith('/')) {
    return {
      error: 'all directory paths must start with /',
    };
  }

  const relativePath = path.normalize('.' + dir.replaceAll('/', path.sep));
  const absolutePath = path.join(repoRoot, relativePath);

  if (!absolutePath.startsWith(repoRoot)) {
    return {
      error: 'cannot list files outside of the repo',
    };
  }
  if (!fs.existsSync(absolutePath)) {
    return {
      error: 'specified directory does not exist',
    };
  }
  if (!fs.lstatSync(absolutePath).isDirectory()) {
    return {
      error: 'specified path is not a directory',
    };
  }

  // list all files and directories in the current directory
  const files: FsItem[] = [];
  const directories: FsItem[] = [];

  const dirItems = fs.readdirSync(absolutePath);
  for (const item of dirItems) {
    const itemAbsolutePath = path.join(absolutePath, item);
    const stats = fs.lstatSync(itemAbsolutePath);

    if (!itemAbsolutePath.startsWith(repoRoot)) {
      ProgramContext.log(
        'error',
        `ls ran into an unexpected path ${itemAbsolutePath} not in the repo root ${repoRoot}`,
      );
      throw new Error('ls ran into an unexpected path not in the repo');
    }

    const itemRelativePath = path.relative(repoRoot, itemAbsolutePath);

    if (stats.isDirectory()) {
      directories.push({
        path: '/' + itemRelativePath.replaceAll(path.sep, '/'),
        size: 0,
      });
    } else {
      files.push({
        path: '/' + itemRelativePath.replaceAll(path.sep, '/'),
        size: stats.size,
      });
    }
  }

  return {
    files,
    directories,
  };
}
