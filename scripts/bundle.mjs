/**
 * Zip the installable module: module/index.js + manifest.json + module.sig
 * (+ any resources in include[]). Output: m81-tron-module.zip — the file you
 * sideload into the m81 Wallet and AirGap Vault.
 *
 * Run: `npm run bundle` (build + sign + this).
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'

for (const f of ['manifest.json', 'module.sig']) {
  if (!existsSync(f)) { console.error(`missing ${f} — run build + sign first.`); process.exit(1) }
}
const manifest = JSON.parse(readFileSync('manifest.json').toString())
const files = ['manifest.json', 'module.sig', ...(manifest.include ?? [])]
const unique = [...new Set(files)].filter((f) => existsSync(f))

execFileSync('zip', ['-q', '-r', 'm81-tron-module.zip', ...unique], { stdio: 'inherit' })
console.log('wrote m81-tron-module.zip:', unique.join(', '))
