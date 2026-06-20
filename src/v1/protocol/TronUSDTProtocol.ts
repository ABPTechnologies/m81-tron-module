/**
 * TronUSDTProtocol — TRC-20 USDT as a token protocol on TronProtocol. This is the
 * m81 settlement asset (USDT, contract TR7N…LJ6t, 6 decimals). Reuses the parent's
 * secp256k1 keypair/address/signing; overrides balance + transfer building to go
 * through the USDT contract via TronGrid.
 */
import {
  ProtocolMetadata,
  ProtocolNetwork,
  PublicKey,
  Balance,
  Amount,
  TransactionDetails,
  TransactionFullConfiguration,
  UnsignedTransaction,
} from '@airgap/module-kit'

import { TronProtocol, TRON_MAINNET_NETWORK, TronTxPayload } from './TronProtocol'
import { TronUnsignedTransaction } from '../clients/trongrid'
import { USDT_TRC20_CONTRACT, USDT_DECIMALS } from '../crypto/trc20'

export class TronUSDTProtocol extends TronProtocol {
  constructor(
    network: ProtocolNetwork = TRON_MAINNET_NETWORK,
    apiKey?: string,
    private readonly contract: string = USDT_TRC20_CONTRACT,
  ) {
    super(network, apiKey)
  }

  async getMetadata(): Promise<ProtocolMetadata> {
    const base = await super.getMetadata()
    return {
      ...base,
      identifier: 'tron-trc20-usdt',
      name: 'USDT (TRC-20)',
      units: { USDT: { symbol: { value: 'USDT', asset: this.contract }, decimals: USDT_DECIMALS } },
      mainUnit: 'USDT',
    }
  }

  async getBalanceOfPublicKey(publicKey: PublicKey): Promise<Balance> {
    const address = await this.getAddressFromPublicKey(publicKey)
    const base = await this.client.getUsdtBalance(address, this.contract)
    return { total: { value: base.toString(), unit: 'USDT' } }
  }

  async getTransactionMaxAmountWithPublicKey(
    publicKey: PublicKey,
    _to: string[],
    _configuration?: TransactionFullConfiguration,
  ): Promise<Amount> {
    const { total } = await this.getBalanceOfPublicKey(publicKey)
    return total
  }

  async prepareTransactionWithPublicKey(
    publicKey: PublicKey,
    details: TransactionDetails[],
    _configuration?: TransactionFullConfiguration,
  ): Promise<UnsignedTransaction> {
    const from = await this.getAddressFromPublicKey(publicKey)
    const to = details[0].to
    const amountBaseUnits = details[0].amount.value // already in 6-decimal base units
    const built: TronUnsignedTransaction = await this.client.buildUsdtTransfer(from, to, amountBaseUnits, {
      contract: this.contract,
    })
    return { type: 'unsigned', ...(built as unknown as TronTxPayload) } as unknown as UnsignedTransaction
  }
}
