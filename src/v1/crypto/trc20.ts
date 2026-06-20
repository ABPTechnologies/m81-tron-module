/**
 * TRC-20 ABI helpers. USDT on Tron uses the standard ERC-20 ABI, so
 * `transfer(address,uint256)` and `balanceOf(address)` encode exactly like EVM:
 * each argument is right-aligned in a 32-byte word. Tron addresses are passed as
 * their 20-byte body (the 0x41 version byte stripped), left-padded to 32 bytes.
 */
import { tronAddressToHex } from './tron-crypto'

/** Mainnet USDT (Tether) TRC-20 contract — 6 decimals. */
export const USDT_TRC20_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
export const USDT_DECIMALS = 6

const pad32 = (hexNo0x: string): string => hexNo0x.padStart(64, '0')

/** 20-byte address body (no 41 prefix), left-padded to a 32-byte ABI word. */
function addressWord(base58Address: string): string {
  const hex41 = tronAddressToHex(base58Address) // 21-byte: 41 + 20-byte body
  const body20 = hex41.slice(2) // drop the 41 version byte
  return pad32(body20)
}

/** uint256 word from a base-10 integer string (token base units). */
function uint256Word(amountBaseUnits: string | bigint): string {
  const v = typeof amountBaseUnits === 'bigint' ? amountBaseUnits : BigInt(amountBaseUnits)
  if (v < 0n) throw new Error('amount must be non-negative')
  return pad32(v.toString(16))
}

/** ABI `parameter` for transfer(address,uint256) — 64 bytes, no function selector. */
export function encodeTransferParams(toBase58: string, amountBaseUnits: string | bigint): string {
  return addressWord(toBase58) + uint256Word(amountBaseUnits)
}

/** ABI `parameter` for balanceOf(address). */
export function encodeBalanceOfParams(ownerBase58: string): string {
  return addressWord(ownerBase58)
}

export const TRANSFER_SELECTOR = 'transfer(address,uint256)'
export const BALANCE_OF_SELECTOR = 'balanceOf(address)'

/** Convert a human USDT amount (e.g. "12.5") to 6-decimal base units. */
export function usdtToBaseUnits(human: string): bigint {
  const [whole, frac = ''] = human.split('.')
  const fracPadded = (frac + '0'.repeat(USDT_DECIMALS)).slice(0, USDT_DECIMALS)
  return BigInt(whole || '0') * 10n ** BigInt(USDT_DECIMALS) + BigInt(fracPadded || '0')
}

/** Convert 6-decimal base units back to a human string. */
export function baseUnitsToUsdt(base: string | bigint): string {
  const v = typeof base === 'bigint' ? base : BigInt(base)
  const d = 10n ** BigInt(USDT_DECIMALS)
  const whole = v / d
  const frac = (v % d).toString().padStart(USDT_DECIMALS, '0').replace(/0+$/, '')
  return frac ? `${whole}.${frac}` : `${whole}`
}
