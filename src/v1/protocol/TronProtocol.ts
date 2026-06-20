/**
 * TronProtocol — the native TRX protocol (account-based, secp256k1).
 * Implements both the offline (Vault: derive/sign) and online (Wallet:
 * balance/build/broadcast) halves of the AirGap protocol interface.
 *
 * The USDT TRC-20 token is a sub-protocol (see TronUSDTProtocol) layered on this.
 *
 * NOTE: targets `@airgap/module-kit` from the `preview/isolated-modules` app
 * builds. Types are imported from module-kit; the substantive Tron logic lives in
 * ../crypto and ../clients and is unit-verified independent of module-kit.
 */
import {
  AirGapProtocol,
  ProtocolMetadata,
  PublicKey,
  SecretKey,
  KeyPair,
  CryptoDerivative,
  Amount,
  Balance,
  AirGapTransaction,
  TransactionDetails,
  TransactionConfiguration,
  UnsignedTransaction,
  SignedTransaction,
  ProtocolNetwork,
  FeeDefaults,
} from '@airgap/module-kit'

import {
  publicKeyFromPrivateKey,
  tronAddressFromPublicKey,
  txIdFromRawDataHex,
  signTxId,
} from '../crypto/tron-crypto'
import { TronGridClient, TronNetwork, TronUnsignedTransaction, TRON_MAINNET } from '../clients/trongrid'

export const TRON_UNITS = {
  TRX: { symbol: 'TRX', decimals: 6 },
}

export interface TronProtocolOptions {
  network: TronNetwork
}

export class TronProtocol implements AirGapProtocol {
  private readonly client: TronGridClient

  constructor(private readonly options: TronProtocolOptions = { network: TRON_MAINNET }) {
    this.client = new TronGridClient(options.network)
  }

  // ---- metadata / network ----------------------------------------------------
  async getMetadata(): Promise<ProtocolMetadata> {
    return {
      identifier: 'tron',
      name: 'Tron',
      units: TRON_UNITS,
      mainUnit: 'TRX',
      account: {
        standardDerivationPath: `m/44'/195'/0'/0/0`, // SLIP-0044 coin type 195
        address: { isCaseSensitive: true, placeholder: 'T…', regex: '^T[1-9A-HJ-NP-Za-km-z]{33}$' },
      },
    } as ProtocolMetadata
  }

  async getNetwork(): Promise<ProtocolNetwork> {
    return {
      name: this.options.network.name,
      type: this.options.network.name === 'mainnet' ? 'mainnet' : 'testnet',
      rpcUrl: this.options.network.rpcUrl,
      blockExplorerUrl: this.options.network.explorerUrl,
    } as ProtocolNetwork
  }

  // ---- offline (Vault) -------------------------------------------------------
  async getCryptoConfiguration() {
    return { algorithm: 'secp256k1' as const }
  }

  async getKeyPairFromDerivative(derivative: CryptoDerivative): Promise<KeyPair> {
    // derivative.secretKey is the BIP32-derived secp256k1 private key (hex).
    const secretKeyHex = derivative.secretKey.replace(/^0x/, '')
    const publicKey = Buffer.from(publicKeyFromPrivateKey(secretKeyHex)).toString('hex')
    return {
      secretKey: { type: 'priv', format: 'hex', value: secretKeyHex } as SecretKey,
      publicKey: { type: 'pub', format: 'hex', value: publicKey } as PublicKey,
    }
  }

  async getAddressFromPublicKey(publicKey: PublicKey): Promise<string> {
    return tronAddressFromPublicKey(Uint8Array.from(Buffer.from(publicKey.value, 'hex')))
  }

  async signTransactionWithSecretKey(
    transaction: UnsignedTransaction,
    secretKey: SecretKey,
  ): Promise<SignedTransaction> {
    const tx = (transaction as unknown as { tron: TronUnsignedTransaction }).tron
    const txId = tx.txID && tx.txID.length === 64 ? tx.txID : txIdFromRawDataHex(tx.raw_data_hex)
    const signature = signTxId(txId, secretKey.value)
    const signed: TronUnsignedTransaction = { ...tx, txID: txId, signature: [signature] }
    return { type: 'signed', tron: signed } as unknown as SignedTransaction
  }

  // ---- online (Wallet) -------------------------------------------------------
  async getBalanceOfPublicKey(publicKey: PublicKey): Promise<Balance> {
    const address = await this.getAddressFromPublicKey(publicKey)
    const sun = await this.client.getTrxBalance(address)
    return { total: { value: sun.toString(), unit: 'TRX' } as Amount } as Balance
  }

  async getTransactionFeeWithPublicKey(): Promise<FeeDefaults> {
    // TRX transfers are paid in bandwidth/energy; surface a conservative TRX cap.
    return { low: '1000000', medium: '1100000', high: '1500000' } as unknown as FeeDefaults
  }

  async prepareTransactionWithPublicKey(
    publicKey: PublicKey,
    details: TransactionDetails[],
    _config?: TransactionConfiguration,
  ): Promise<UnsignedTransaction> {
    const from = await this.getAddressFromPublicKey(publicKey)
    const to = details[0].to
    const amount = details[0].amount.value
    const built = await this.buildNativeTransfer(from, to, amount)
    return { type: 'unsigned', tron: built } as unknown as UnsignedTransaction
  }

  async broadcastTransaction(transaction: SignedTransaction): Promise<string> {
    const tx = (transaction as unknown as { tron: TronUnsignedTransaction }).tron
    const r = await this.client.broadcast(tx)
    if (r.result === false) throw new Error(`broadcast failed: ${r.message ?? 'unknown'}`)
    return r.txid ?? tx.txID
  }

  async getDetailsFromTransaction(
    transaction: UnsignedTransaction | SignedTransaction,
    publicKey: PublicKey,
  ): Promise<AirGapTransaction[]> {
    const from = await this.getAddressFromPublicKey(publicKey)
    const tx = (transaction as unknown as { tron: TronUnsignedTransaction }).tron
    return [
      {
        from: [from],
        to: [],
        amount: { value: '0', unit: 'TRX' },
        fee: { value: '0', unit: 'TRX' },
        network: await this.getNetwork(),
        // txID surfaced so the Vault can show the user what they're signing.
        extra: { txID: tx.txID },
      } as unknown as AirGapTransaction,
    ]
  }

  // ---- helper used by the native + token paths -------------------------------
  protected buildNativeTransfer(from: string, to: string, amountSun: string) {
    // Native TRX transfer is /wallet/createtransaction; for USDT the sub-protocol
    // overrides this with /wallet/triggersmartcontract (see TronUSDTProtocol).
    return this.client['post']<TronUnsignedTransaction>('/wallet/createtransaction', {
      owner_address: from,
      to_address: to,
      amount: Number(amountSun),
      visible: true,
    })
  }
}
