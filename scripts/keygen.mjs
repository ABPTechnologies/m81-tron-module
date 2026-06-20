/**
 * Generate the Ed25519 module-signing keypair. The PUBLIC key goes in
 * manifest.json (`publicKey`); the SECRET key signs the bundle (module.sig).
 *
 * Run once: `npm run keygen`. Writes module-signing.key (secret, gitignored) and
 * prints the public key to paste into manifest.json. KEEP THE SECRET KEY SAFE —
 * it is what proves this module is genuinely from ABP/m81.
 */
import { ed25519 } from '@noble/curves/ed25519'
import { writeFileSync, existsSync } from 'node:fs'

if (existsSync('module-signing.key')) {
  console.error('module-signing.key already exists — refusing to overwrite. Delete it first if you really mean to rotate.')
  process.exit(1)
}

const secret = ed25519.utils.randomPrivateKey()
const publicKey = ed25519.getPublicKey(secret)

writeFileSync('module-signing.key', Buffer.from(secret).toString('hex') + '\n', { mode: 0o600 })
console.log('wrote module-signing.key (secret, mode 600 — keep offline / out of git)')
console.log('manifest.json publicKey:', Buffer.from(publicKey).toString('hex'))
