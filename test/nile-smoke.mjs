/**
 * Nile testnet smoke-test — proves the module's full path end-to-end against the
 * real Tron testnet, with NO mainnet funds and NO wallet/Vault build required.
 *
 * It exercises the same primitives the AirGap protocol uses:
 *   derive address  →  read TRX balance  →  read TRC-20 balance (optional)
 *   →  build a native TRX transfer  →  sign (offline path)  →  broadcast.
 *
 * Read-only by default. Broadcasting requires opt-in + a funded testnet key.
 *
 *   # read-only: generate a throwaway key, show its address + balances
 *   npm run smoke:nile
 *
 *   # use a specific testnet key (get test TRX from https://nileex.io/join/getJoinPage)
 *   TRON_TEST_PRIV=<64-hex> npm run smoke:nile
 *
 *   # also read a TRC-20 balance
 *   TRON_TEST_PRIV=<hex> TRON_TRC20=<contractBase58> npm run smoke:nile
 *
 *   # actually broadcast a 1-TRX transfer (proves create→sign→broadcast)
 *   TRON_TEST_PRIV=<hex> TRON_TO=<base58> TRON_SMOKE_SEND=1 npm run smoke:nile
 */
import * as secp from '@noble/secp256k1'
import { keccak_256 } from '@noble/hashes/sha3'
import { sha256 } from '@noble/hashes/sha256'
import { hmac } from '@noble/hashes/hmac'
import bs58 from 'bs58'

secp.etc.hmacSha256Sync = (key, ...msgs) => hmac(sha256, key, secp.etc.concatBytes(...msgs))
const hex = (u8) => Buffer.from(u8).toString('hex')
const fromHex = (h) => Uint8Array.from(Buffer.from(h.replace(/^0x/, ''), 'hex'))

const RPC = 'https://nile.trongrid.io'
const EXPLORER = 'https://nile.tronscan.org'

// ---- crypto (mirror src/v1/crypto) ----
function pubToAddr(pub) {
  const body = pub.length === 65 ? pub.subarray(1) : pub
  const h = keccak_256(body)
  const a = new Uint8Array(21); a[0] = 0x41; a.set(h.subarray(h.length - 20), 1)
  const c = sha256(sha256(a)).subarray(0, 4)
  const f = new Uint8Array(25); f.set(a); f.set(c, 21)
  return bs58.encode(f)
}
const privToAddr = (p) => pubToAddr(secp.getPublicKey(fromHex(p), false))
const txId = (rawHex) => hex(sha256(fromHex(rawHex)))
function signTxId(id, priv) {
  const s = secp.sign(fromHex(id), fromHex(priv))
  return s.r.toString(16).padStart(64, '0') + s.s.toString(16).padStart(64, '0') + s.recovery.toString(16).padStart(2, '0')
}
const addrToHex41 = (b58) => Buffer.from(bs58.decode(b58).subarray(0, 21)).toString('hex')
const pad32 = (h) => h.padStart(64, '0')
const balanceOfParam = (b58) => pad32(addrToHex41(b58).slice(2))

async function rpc(path, body) {
  const r = await fetch(`${RPC}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!r.ok) throw new Error(`${path} → HTTP ${r.status}`)
  return r.json()
}

// ---- run ----
const priv = (process.env.TRON_TEST_PRIV || hex(secp.utils.randomPrivateKey())).replace(/^0x/, '')
const generated = !process.env.TRON_TEST_PRIV
const addr = privToAddr(priv)

console.log('network   : Nile testnet')
console.log('address   :', addr, generated ? '(throwaway — set TRON_TEST_PRIV to reuse)' : '')
console.log('explorer  :', `${EXPLORER}/#/address/${addr}`)

// 1) TRX balance
const acct = await rpc('/wallet/getaccount', { address: addr, visible: true })
const sun = BigInt(acct.balance ?? 0)
console.log('TRX bal   :', (Number(sun) / 1e6).toString(), 'TRX', `(${sun} SUN)`)
if (sun === 0n) console.log('  → fund it at the Nile faucet: https://nileex.io/join/getJoinPage')

// 2) optional TRC-20 balance
if (process.env.TRON_TRC20) {
  const r = await rpc('/wallet/triggerconstantcontract', {
    owner_address: addr, contract_address: process.env.TRON_TRC20,
    function_selector: 'balanceOf(address)', parameter: balanceOfParam(addr), visible: true,
  })
  const word = r.constant_result?.[0]
  console.log('TRC20 bal :', word ? BigInt('0x' + word).toString() : '0', `(contract ${process.env.TRON_TRC20})`)
}

// 3) optional broadcast: native TRX transfer (proves create → sign → broadcast)
if (process.env.TRON_SMOKE_SEND === '1') {
  if (!process.env.TRON_TO) { console.error('\nTRON_SMOKE_SEND=1 needs TRON_TO=<recipient base58>'); process.exit(1) }
  if (sun < 1_100_000n) { console.error('\nneed ≥ ~1.1 TRX to send — fund via the faucet first'); process.exit(1) }
  console.log('\n— building native TRX transfer (1 TRX) —')
  const built = await rpc('/wallet/createtransaction', { owner_address: addr, to_address: process.env.TRON_TO, amount: 1_000_000, visible: true })
  const id = built.txID && built.txID.length === 64 ? built.txID : txId(built.raw_data_hex)
  const sig = signTxId(id, priv)
  console.log('txID      :', id)
  console.log('signature :', sig.slice(0, 16) + '…', `(${sig.length / 2} bytes)`) // offline-signed
  const res = await rpc('/wallet/broadcasttransaction', { ...built, txID: id, signature: [sig] })
  console.log('broadcast :', res.result === true ? 'ACCEPTED' : `rejected — ${res.message ? Buffer.from(res.message, 'hex').toString() : JSON.stringify(res)}`)
  if (res.result === true) console.log('tx        :', `${EXPLORER}/#/transaction/${id}`)
} else {
  console.log('\n(read-only — set TRON_SMOKE_SEND=1 + TRON_TO + a funded TRON_TEST_PRIV to test broadcast)')
}
