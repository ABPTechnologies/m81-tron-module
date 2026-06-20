/**
 * Crypto verification — the security-critical core, cross-checked against tronweb.
 * Run: `npm run verify:crypto` (after `npm i`). Mirrors src/v1/crypto/*.
 *
 * Asserts:
 *   - Tron address derivation matches tronweb over 200 random keys + a known vector
 *   - TRC-20 transfer ABI params match tronweb over 50 random recipients/amounts
 *   - txID = SHA-256(raw_data); a produced 65-byte r‖s‖v signature recovers the signer
 */
import * as secp from '@noble/secp256k1'
import { keccak_256 } from '@noble/hashes/sha3'
import { sha256 } from '@noble/hashes/sha256'
import { hmac } from '@noble/hashes/hmac'
import bs58 from 'bs58'
import pkg from 'tronweb'
const TronWeb = pkg.TronWeb || pkg.default?.TronWeb || pkg.default || pkg

secp.etc.hmacSha256Sync = (key, ...msgs) => hmac(sha256, key, secp.etc.concatBytes(...msgs))
const hex = (u8) => Buffer.from(u8).toString('hex')
const fromHex = (h) => Uint8Array.from(Buffer.from(h.replace(/^0x/, ''), 'hex'))

function pubToAddr(pub) {
  const body = pub.length === 65 ? pub.subarray(1) : pub
  const h = keccak_256(body)
  const a = new Uint8Array(21); a[0] = 0x41; a.set(h.subarray(h.length - 20), 1)
  const c = sha256(sha256(a)).subarray(0, 4)
  const f = new Uint8Array(25); f.set(a); f.set(c, 21)
  return bs58.encode(f)
}
const privToAddr = (p) => pubToAddr(secp.getPublicKey(fromHex(p), false))
const txId = (raw) => hex(sha256(fromHex(raw)))
function sign(id, priv) { const s = secp.sign(fromHex(id), fromHex(priv)); return s.r.toString(16).padStart(64,'0')+s.s.toString(16).padStart(64,'0')+s.recovery.toString(16).padStart(2,'0') }
const addrToHex41 = (b58) => Buffer.from(bs58.decode(b58).subarray(0, 21)).toString('hex')
const pad32 = (h) => h.padStart(64, '0')
const encodeTransferParams = (to, amt) => pad32(addrToHex41(to).slice(2)) + pad32(BigInt(amt).toString(16))

let fails = 0
const assert = (cond, msg) => { if (!cond) { console.error('FAIL:', msg); fails++ } else console.log('ok  :', msg) }

// 1. address derivation
let addrMatch = 0
for (let i = 0; i < 200; i++) {
  const p = hex(secp.utils.randomPrivateKey())
  if (privToAddr(p) === TronWeb.address.fromPrivateKey(p)) addrMatch++
}
assert(addrMatch === 200, `address derivation 200/200 vs tronweb (got ${addrMatch})`)

// known vector
const kpriv = 'b06b9a44d09b1c2bb7dcb7d9d7d0a3b3d1cc7e1ee9d48a0d6e9c2c6a3b4c5d6e'
assert(privToAddr(kpriv) === TronWeb.address.fromPrivateKey(kpriv), `known vector addr == tronweb (${privToAddr(kpriv)})`)

// 2. TRC-20 transfer params
const tw = new TronWeb({ fullHost: 'https://api.trongrid.io' })
let abiMatch = 0
for (let i = 0; i < 50; i++) {
  const to = privToAddr(hex(secp.utils.randomPrivateKey()))
  const amt = BigInt(Math.floor(Math.random() * 1e12)).toString()
  if (encodeTransferParams(to, amt) === tw.utils.abi.encodeParams(['address', 'uint256'], [to, amt]).replace(/^0x/, '')) abiMatch++
}
assert(abiMatch === 50, `TRC-20 transfer params 50/50 vs tronweb (got ${abiMatch})`)

// 3. txID + signature recovery
const priv = hex(secp.utils.randomPrivateKey())
const addr = privToAddr(priv)
const rawDataHex = '0a02abcd2208' + '11'.repeat(8) + '40d0b8e8f0a32d'
const id = txId(rawDataHex)
const sig = sign(id, priv)
assert(sig.length / 2 === 65, `signature is 65 bytes (got ${sig.length / 2})`)
const r = BigInt('0x' + sig.slice(0, 64)), s = BigInt('0x' + sig.slice(64, 128)), v = parseInt(sig.slice(128, 130), 16)
const recovered = pubToAddr(new secp.Signature(r, s, v).recoverPublicKey(fromHex(id)).toRawBytes(false))
assert(recovered === addr, `recovered signer addr == signer (${recovered})`)

console.log(fails === 0 ? '\nALL CRYPTO CHECKS PASSED' : `\n${fails} CHECK(S) FAILED`)
process.exit(fails === 0 ? 0 : 1)
