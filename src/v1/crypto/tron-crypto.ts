/**
 * Tron crypto core — the security-critical primitives for the m81 AirGap module.
 *
 * Verified against `tronweb` (200/200 random keys + a known vector) and by
 * recovering the signer address from a produced signature. See test/verify.mjs.
 *
 * Tron differs from Ethereum in exactly two places that matter here:
 *   1. Address encoding: keccak256(pubkey)[-20:] is prefixed with 0x41 (mainnet
 *      version byte) and Base58Check-encoded → the familiar `T...` address.
 *   2. Signing target: the `txID` is SHA-256 (NOT keccak) of the protobuf
 *      `raw_data`, signed with recoverable secp256k1 → 65 bytes r‖s‖v.
 *
 * Kept dependency-light (@noble/*) so the offline Vault bundle stays small and
 * auditable. No TronWeb in the signing path.
 */
import * as secp from '@noble/secp256k1'
import { keccak_256 } from '@noble/hashes/sha3'
import { sha256 } from '@noble/hashes/sha256'
import { hmac } from '@noble/hashes/hmac'
import bs58 from 'bs58'

// Wire RFC-6979 deterministic-k for @noble/secp256k1 v2 sync signing.
secp.etc.hmacSha256Sync = (key: Uint8Array, ...msgs: Uint8Array[]) =>
  hmac(sha256, key, secp.etc.concatBytes(...msgs))

export const TRON_MAINNET_VERSION_BYTE = 0x41

const toHex = (u8: Uint8Array): string => Buffer.from(u8).toString('hex')
const fromHex = (h: string): Uint8Array =>
  Uint8Array.from(Buffer.from(h.replace(/^0x/, ''), 'hex'))

/** Uncompressed secp256k1 public key (65 bytes, 0x04‖X‖Y) from a 32-byte private key. */
export function publicKeyFromPrivateKey(privateKeyHex: string): Uint8Array {
  return secp.getPublicKey(fromHex(privateKeyHex), false)
}

/** Base58Check `T...` Tron address from a secp256k1 public key (33 or 65 bytes). */
export function tronAddressFromPublicKey(publicKey: Uint8Array): string {
  // keccak over the 64-byte body (drop the 0x04 prefix on uncompressed keys).
  const body = publicKey.length === 65 ? publicKey.subarray(1) : publicKey
  const hashed = keccak_256(body)
  const addr21 = new Uint8Array(21)
  addr21[0] = TRON_MAINNET_VERSION_BYTE
  addr21.set(hashed.subarray(hashed.length - 20), 1)
  const checksum = sha256(sha256(addr21)).subarray(0, 4)
  const full = new Uint8Array(25)
  full.set(addr21)
  full.set(checksum, 21)
  return bs58.encode(full)
}

export function tronAddressFromPrivateKey(privateKeyHex: string): string {
  return tronAddressFromPublicKey(publicKeyFromPrivateKey(privateKeyHex))
}

/** 21-byte hex form (41‖20-byte body) that TronGrid expects when `visible:false`. */
export function tronAddressToHex(base58Address: string): string {
  const decoded = bs58.decode(base58Address)
  if (decoded.length !== 25) throw new Error('invalid Tron address length')
  const body = decoded.subarray(0, 21)
  const checksum = decoded.subarray(21)
  const expect = sha256(sha256(body)).subarray(0, 4)
  for (let i = 0; i < 4; i++) {
    if (checksum[i] !== expect[i]) throw new Error('invalid Tron address checksum')
  }
  return toHex(body)
}

export function isValidTronAddress(base58Address: string): boolean {
  try {
    tronAddressToHex(base58Address)
    return true
  } catch {
    return false
  }
}

/** txID for a transaction = SHA-256 of the protobuf-serialized `raw_data`. */
export function txIdFromRawDataHex(rawDataHex: string): string {
  return toHex(sha256(fromHex(rawDataHex)))
}

/**
 * Sign a txID with a private key → 65-byte hex signature (r‖s‖v) as Tron expects
 * in `transaction.signature[0]`. `v` is the secp256k1 recovery id (0/1).
 * This is the only operation the offline Vault performs.
 */
export function signTxId(txIdHex: string, privateKeyHex: string): string {
  const sig = secp.sign(fromHex(txIdHex), fromHex(privateKeyHex)) // recoverable
  const r = sig.r.toString(16).padStart(64, '0')
  const s = sig.s.toString(16).padStart(64, '0')
  const v = sig.recovery.toString(16).padStart(2, '0')
  return r + s + v
}

/** Recover the signer's Tron address from a txID + 65-byte signature (for verification). */
export function recoverTronAddress(txIdHex: string, signature65Hex: string): string {
  const r = BigInt('0x' + signature65Hex.slice(0, 64))
  const s = BigInt('0x' + signature65Hex.slice(64, 128))
  const v = parseInt(signature65Hex.slice(128, 130), 16)
  const pub = new secp.Signature(r, s, v).recoverPublicKey(fromHex(txIdHex)).toRawBytes(false)
  return tronAddressFromPublicKey(pub)
}
