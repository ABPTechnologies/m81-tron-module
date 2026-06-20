/**
 * Bundle src/index.ts → module/index.js as a single self-contained IIFE that
 * exposes the exports on a global namespace (referenced by manifest.json
 * `src.namespace`). The AirGap app loads this file in its isolated JS context.
 */
import { build } from 'esbuild'
import { mkdirSync, copyFileSync, existsSync } from 'node:fs'

mkdirSync('module', { recursive: true })

// copy token icons → module/assets/ (referenced by manifest res.symbol + include[])
mkdirSync('module/assets', { recursive: true })
for (const icon of ['trx.svg', 'usdt.svg']) {
  if (existsSync(`assets/${icon}`)) copyFileSync(`assets/${icon}`, `module/assets/${icon}`)
}

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
