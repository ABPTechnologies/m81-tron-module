/**
 * Ed25519-sign the module bundle → module.sig.
 *
 * AirGap's signing rule: concatenate the bytes of every file listed in
 * manifest.json `include[]` IN ORDER, then append manifest.json itself LAST,
 * Ed25519-sign that buffer, and write the signature to module.sig.
 *
 * Run: `npm run sign` (after `npm run build`). Requires module-signing.key.
 */
import { ed25519 } from '@noble/curves/ed25519'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

if (!existsSync('module-signing.key')) {
  console.error('missing module-signing.key — run `npm run keygen` first.')
  process.exit(1)
}
const secret = Uint8Array.from(Buffer.from(readFileSync('module-signing.key', 'utf8').trim(), 'hex'))

const manifestRaw = readFileSync('manifest.json')
const manifest = JSON.parse(manifestRaw.toString())
const include = manifest.include ?? []

const parts = []
for (const f of include) {
  if (!existsSync(f)) { console.error(`include file missing: ${f}`); process.exit(1) }
  parts.push(readFileSync(f))
}
parts.push(manifestRaw) // manifest LAST

const message = Buffer.concat(parts)
const signature = ed25519.sign(message, secret)

// sanity: verify against the manifest's declared publicKey
const pub = Uint8Array.from(Buffer.from(manifest.publicKey, 'hex'))
if (!ed25519.verify(signature, message, pub)) {
  console.error('signature does NOT verify against manifest.publicKey — keypair mismatch.')
  process.exit(1)
}

writeFileSync('module.sig', Buffer.from(signature))
console.log(`signed ${include.length} file(s) + manifest → module.sig (verified against manifest.publicKey)`)
