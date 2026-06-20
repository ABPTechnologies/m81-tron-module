/**
 * TronUSDTProtocol — TRC-20 USDT as a single-token sub-protocol on TronProtocol.
 * This is the m81 settlement asset (USDT, contract TR7N…LJ6t, 6 decimals).
 *
 * Reuses the parent's secp256k1 keypair/address/signing; overrides balance and
 * transfer building to go through the USDT contract via TronGrid.
 */
import {
  PublicKey,
  Balance,
  Amount,
  TransactionDetails,
  TransactionConfiguration,
  UnsignedTransaction,
  AirGapTransaction,
  ProtocolMetadata,
} from '@airgap/module-kit'

import { TronProtocol, TronProtocolOptions } from './TronProtocol'
import { TronGridClient, TRON_MAINNET } from '../clients/trongrid'
import { USDT_TRC20_CONTRACT, USDT_DECIMALS, baseUnitsToUsdt } from '../crypto/trc20'

export class TronUSDTProtocol extends TronProtocol {
  private readonly usdtClient: TronGridClient
  private readonly contract: string

  constructor(
    options: TronProtocolOptions = { network: TRON_MAINNET },
    contract: string = USDT_TRC20_CONTRACT,
  ) {
    super(options)
    this.usdtClient = new TronGridClient(options.network)
    this.contract = contract
  }

  async getMetadata(): Promise<ProtocolMetadata> {
    const base = await super.getMetadata()
    return {
      ...base,
      identifier: 'tron-trc20-usdt',
      name: 'USDT (TRC-20)',
      units: { USDT: { symbol: 'USDT', decimals: USDT_DECIMALS } },
      mainUnit: 'USDT',
      // single-token sub-protocol metadata
      subProtocol: { type: 'token', contractAddress: this.contract, mainProtocol: 'tron' },
    } as unknown as ProtocolMetadata
  }

  async getBalanceOfPublicKey(publicKey: PublicKey): Promise<Balance> {
    const address = await this.getAddressFromPublicKey(publicKey)
    const base = await this.usdtClient.getUsdtBalance(address, this.contract)
    return { total: { value: base.toString(), unit: 'USDT' } as Amount } as Balance
  }

  async prepareTransactionWithPublicKey(
    publicKey: PublicKey,
    details: TransactionDetails[],
    _config?: TransactionConfiguration,
  ): Promise<UnsignedTransaction> {
    const from = await this.getAddressFromPublicKey(publicKey)
    const to = details[0].to
    const amountBaseUnits = details[0].amount.value // already in 6-decimal base units
    const built = await this.usdtClient.buildUsdtTransfer(from, to, amountBaseUnits, {
      contract: this.contract,
    })
    return { type: 'unsigned', tron: built } as unknown as UnsignedTransaction
  }

  async getDetailsFromTransaction(
    transaction: UnsignedTransaction,
    publicKey: PublicKey,
  ): Promise<AirGapTransaction[]> {
    const details = await super.getDetailsFromTransaction(transaction, publicKey)
    // Re-label units as USDT; amount decoding from raw_data is done in the Wallet
    // UI layer where the recipient/amount are parsed from the contract call.
    return details.map((d) => ({
      ...d,
      amount: { value: d.amount.value, unit: 'USDT' },
      extra: { ...(d as unknown as { extra?: object }).extra, contract: this.contract, decimals: USDT_DECIMALS },
    })) as AirGapTransaction[]
  }
}

export { baseUnitsToUsdt }
