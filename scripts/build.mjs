/**
 * Bundle src/index.ts → module/index.js as a single self-contained IIFE that
 * exposes the exports on a global namespace (referenced by manifest.json
 * `src.namespace`). The AirGap app loads this file in its isolated JS context.
 */
import { build } from 'esbuild'
import { mkdirSync } from 'node:fs'

mkdirSync('module', { recursive: true })

await build({
  entryPoints: ['src/index.ts'],
  outfile: 'module/index.js',
  bundle: true,
  format: 'iife',
  globalName: 'tronModule', // must match manifest.json src.namespace
  platform: 'browser',
  target: 'es2020',
  // module-kit is provided by the host app's isolated runtime — keep it external.
  external: ['@airgap/module-kit'],
  legalComments: 'none',
  minify: false,
})

console.log('built module/index.js')
