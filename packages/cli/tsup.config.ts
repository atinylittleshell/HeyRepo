import type { Options } from 'tsup';

export const tsup: Options = {
  outDir: 'dist',
  clean: true,
  dts: false,
  sourcemap: true,
  format: ['esm'],
  minify: true,
  entry: ['index.ts'],
  target: 'node16',
};
