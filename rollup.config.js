// @ts-check

import { join } from 'path'
import { defineConfig } from 'rollup'
import esbuild from 'rollup-plugin-esbuild'
import clientPackages from './client/package.json'
import packages from './package.json'

const baseConfig = defineConfig({
  plugins: [
    esbuild(),
  ],
})

export default defineConfig([{
  input: './src/worker/fiberworks.ts',
  output: [
    { format: 'esm', file: packages.module },
    { format: 'cjs', file: packages.main },
  ],
  ...baseConfig,
}, {
  input: './src/client/fiberworks-client.ts',
  output: [
    { format: 'esm', file: join('client', clientPackages.module) },
    { format: 'cjs', file: join('client', clientPackages.main) },
  ],
  ...baseConfig,
}])
