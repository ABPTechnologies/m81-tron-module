import { AirGapModule } from '@airgap/module-kit'
import { TronModule } from './v1/module'

/** AirGap isolated-module entrypoint. `manifest.json.src.namespace` resolves to this. */
export function create(): AirGapModule {
  return new TronModule()
}

export { TronModule }

// Settlement/reconciliation surface — consumed by pm-wallet to detect on-chain
// USDT-TRC20 arrivals at the m81 address (read-only TronGrid).
export {
  TronGridClient,
  TRON_MAINNET,
  TRON_NILE_TESTNET,
  type TronNetwork,
  type Trc20Transfer,
  type TronUnsignedTransaction,
} from './v1/clients/trongrid'
export {
  USDT_TRC20_CONTRACT,
  USDT_DECIMALS,
  baseUnitsToUsdt,
  usdtToBaseUnits,
} from './v1/crypto/trc20'
export {
  tronAddressFromPublicKey,
  tronAddressFromPrivateKey,
  isValidTronAddress,
} from './v1/crypto/tron-crypto'
