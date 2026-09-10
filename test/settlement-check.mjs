/**
 * Settlement detection check — read-only, MAINNET. Proves the m81 settlement
 * reconciliation source: the current USDT-TRC20 balance at an address plus the
 * recent inbound USDT transfers (what a MEXC→m81 withdrawal would show up as).
 *
 *   M81_TRON_ADDRESS=T... npm run check:settlement
 *   # optional: TRONGRID_API_KEY=<key> for higher rate limits
 *
 * Moves no funds; just reads the chain via TronGrid.
 */
import { TronGridClient, TRON_MAINNET } from '../lib/v1/clients/trongrid.js'
import { baseUnitsToUsdt } from '../lib/v1/crypto/trc20.js'

const address = process.env.M81_TRON_ADDRESS
if (!address) {
  console.error('set M81_TRON_ADDRESS=T... (the Tron address m81 settles to)')
  process.exit(1)
}

const client = new TronGridClient({ ...TRON_MAINNET, apiKey: process.env.TRONGRID_API_KEY })

console.log('network    : Tron mainnet')
console.log('m81 address:', address)
console.log('explorer   :', `${TRON_MAINNET.explorerUrl}/#/address/${address}`)

const bal = await client.getUsdtBalance(address)
console.log('USDT balance (on-chain):', baseUnitsToUsdt(bal), 'USDT')

const inbound = await client.listInboundTrc20(address, { limit: 10 })
console.log(`\nrecent inbound USDT transfers: ${inbound.length}`)
for (const t of inbound) {
  const when = new Date(t.timestampMs).toISOString().replace('T', ' ').slice(0, 19)
  console.log(`  ${when}  +${baseUnitsToUsdt(t.value)} USDT  from ${t.from}  tx ${t.txID.slice(0, 16)}…`)
}
if (inbound.length === 0) console.log('  (none yet — a MEXC→m81 TRC-20 withdrawal will appear here)')
