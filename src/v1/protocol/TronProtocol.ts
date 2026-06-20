/**
 * TronProtocol — native TRX protocol (account-based, secp256k1). Implements the
 * full AirGapProtocol surface (offline: derive/sign; online: balance/build/
 * broadcast). The USDT TRC-20 token extends this (see TronUSDTProtocol).
 *
 * Conformed to @airgap/module-kit@0.13.46. The substantive Tron logic lives in
 * ../crypto + ../clients (unit-verified vs tronweb and proven on Nile testnet);
 * this file is the typed module-kit wrapper. Sealed key/transaction types are
 * cast at the boundaries — the module-kit transaction payload is opaque, so we
 * carry the real Tron fields through and cast in/out.
 */
import {
  AirGapProtocol,
  ProtocolMetadata,
  ProtocolNetwork,
  PublicKey,
  SecretKey,
  KeyPair,
  CryptoConfiguration,
  CryptoDerivative,
  Amount,
  Balance,
  FeeEstimation,
  AirGapTransaction,
  AirGapTransactionsWithCursor,
  TransactionCursor,
  TransactionDetails,
  TransactionFullConfiguration,
  TransactionSimpleConfiguration,
  UnsignedTransaction,
  SignedTransaction,
} from '@airgap/module-kit'

import {
  publicKeyFromPrivateKey,
  tronAddressFromPublicKey,
  txIdFromRawDataHex,
  signTxId,
} from '../crypto/tron-crypto'
import { TronGridClient, TronUnsignedTransaction } from '../clients/trongrid'

/** The Tron transaction payload we carry inside the opaque module-kit tx types. */
export interface TronTxPayload {
  txID: string
  raw_data?: unknown
  raw_data_hex: string
  visible?: boolean
  signature?: string[]
}

export const TRON_MAINNET_NETWORK: ProtocolNetwork = {
  name: 'Mainnet',
  type: 'mainnet',
  rpcUrl: 'https://api.trongrid.io',
  blockExplorerUrl: 'https://tronscan.org',
}
export const TRON_NILE_NETWORK: ProtocolNetwork = {
  name: 'Nile Testnet',
  type: 'testnet',
  rpcUrl: 'https://nile.trongrid.io',
  blockExplorerUrl: 'https://nile.tronscan.org',
}

export class TronProtocol implements AirGapProtocol {
  protected readonly client: TronGridClient

  constructor(
    protected readonly network: ProtocolNetwork = TRON_MAINNET_NETWORK,
    protected readonly apiKey?: string,
  ) {
    this.client = new TronGridClient({
      name: network.name,
      rpcUrl: network.rpcUrl,
      explorerUrl: network.blockExplorerUrl,
      apiKey,
    })
  }

  // ---- metadata / network ----------------------------------------------------
  async getMetadata(): Promise<ProtocolMetadata> {
    return {
      identifier: 'tron',
      name: 'Tron',
      units: { TRX: { symbol: { value: 'TRX' }, decimals: 6 } },
      mainUnit: 'TRX',
      account: {
        standardDerivationPath: `m/44'/195'/0'/0/0`, // SLIP-0044 coin type 195
        address: { isCaseSensitive: true, placeholder: 'T…', regex: '^T[1-9A-HJ-NP-Za-km-z]{33}$' },
      },
    }
  }

  async getNetwork(): Promise<ProtocolNetwork> {
    return this.network
  }

  // ---- offline (Vault) -------------------------------------------------------
  async getCryptoConfiguration(): Promise<CryptoConfiguration> {
    return { algorithm: 'secp256k1' }
  }

  async getKeyPairFromDerivative(derivative: CryptoDerivative): Promise<KeyPair> {
    const secretKeyHex = derivative.secretKey.replace(/^0x/, '')
    const publicKeyHex = Buffer.from(publicKeyFromPrivateKey(secretKeyHex)).toString('hex')
    return {
      secretKey: { format: 'hex', value: secretKeyHex } as SecretKey,
      publicKey: { format: 'hex', value: publicKeyHex } as PublicKey,
    }
  }

  async getAddressFromPublicKey(publicKey: PublicKey): Promise<string> {
    return tronAddressFromPublicKey(Uint8Array.from(Buffer.from(publicKey.value, 'hex')))
  }

  async signTransactionWithSecretKey(
    transaction: UnsignedTransaction,
    secretKey: SecretKey,
  ): Promise<SignedTransaction> {
    const tx = transaction as unknown as TronTxPayload
    const txId = tx.txID && tx.txID.length === 64 ? tx.txID : txIdFromRawDataHex(tx.raw_data_hex)
    const signature = signTxId(txId, secretKey.value)
    const signed: TronTxPayload = { ...tx, txID: txId, signature: [signature] }
    return { type: 'signed', ...signed } as unknown as SignedTransaction
  }

  // ---- online (Wallet) -------------------------------------------------------
  async getBalanceOfPublicKey(publicKey: PublicKey): Promise<Balance> {
    const address = await this.getAddressFromPublicKey(publicKey)
    const sun = await this.client.getTrxBalance(address)
    return { total: { value: sun.toString(), unit: 'TRX' } }
  }

  async getTransactionsForPublicKey(
    _publicKey: PublicKey,
    _limit: number,
    cursor?: TransactionCursor,
  ): Promise<AirGapTransactionsWithCursor> {
    // History is surfaced via the block explorer link; no indexer wired here.
    return { transactions: [], cursor: { hasNext: false, ...(cursor ?? {}) } as TransactionCursor }
  }

  async getTransactionMaxAmountWithPublicKey(
    publicKey: PublicKey,
    _to: string[],
    _configuration?: TransactionFullConfiguration,
  ): Promise<Amount> {
    const { total } = await this.getBalanceOfPublicKey(publicKey)
    return total
  }

  async getTransactionFeeWithPublicKey(
    _publicKey: PublicKey,
    _details: TransactionDetails[],
    _configuration?: TransactionSimpleConfiguration,
  ): Promise<FeeEstimation> {
    // TRX transfers are paid in bandwidth/energy; surface a conservative TRX cap.
    return {
      low: { value: '1000000', unit: 'TRX' },
      medium: { value: '1100000', unit: 'TRX' },
      high: { value: '1500000', unit: 'TRX' },
    }
  }

  async prepareTransactionWithPublicKey(
    publicKey: PublicKey,
    details: TransactionDetails[],
    _configuration?: TransactionFullConfiguration,
  ): Promise<UnsignedTransaction> {
    const from = await this.getAddressFromPublicKey(publicKey)
    const to = details[0].to
    const amount = details[0].amount.value
    const built = await this.buildNativeTransfer(from, to, amount)
    return { type: 'unsigned', ...(built as unknown as TronTxPayload) } as unknown as UnsignedTransaction
  }

  async broadcastTransaction(transaction: SignedTransaction): Promise<string> {
    const tx = transaction as unknown as TronUnsignedTransaction
    const r = await this.client.broadcast(tx)
    if (r.result === false) throw new Error(`broadcast failed: ${r.message ?? 'unknown'}`)
    return r.txid ?? tx.txID
  }

  async getDetailsFromTransaction(
    transaction: UnsignedTransaction | SignedTransaction,
    publicKey: PublicKey,
  ): Promise<AirGapTransaction[]> {
    const from = await this.getAddressFromPublicKey(publicKey)
    const tx = transaction as unknown as TronTxPayload
    return [
      {
        from: [from],
        to: [],
        isInbound: false,
        amount: { value: '0', unit: 'TRX' },
        fee: { value: '0', unit: 'TRX' },
        network: this.network,
        json: { txID: tx.txID },
      },
    ]
  }

  // ---- helper (overridden by the TRC-20 sub-protocol) ------------------------
  protected buildNativeTransfer(from: string, to: string, amountSun: string): Promise<TronUnsignedTransaction> {
    return this.client.createNativeTransfer(from, to, Number(amountSun))
  }
}
