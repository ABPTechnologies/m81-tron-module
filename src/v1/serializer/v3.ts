/**
 * V3 serializer companion — the QR transport between the online Wallet (builds the
 * unsigned tx) and the offline Vault (signs it). For Tron the only payload that
 * must cross the air-gap is `raw_data_hex` (+ txID); the Vault hashes + signs it,
 * and the signature crosses back.
 *
 * Conformed to AirGapV3SerializerCompanion@0.13.46. TransactionSignRequest/Response
 * come from @airgap/serializer (transaction payload is generic `T`).
 */
import { TransactionSignRequest, TransactionSignResponse } from '@airgap/serializer'
import { AirGapV3SerializerCompanion, V3SchemaConfiguration, UnsignedTransaction, SignedTransaction } from '@airgap/module-kit'

const TRON_SIGN_REQUEST_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  properties: {
    transaction: {
      type: 'object',
      properties: {
        txID: { type: 'string' },
        raw_data_hex: { type: 'string' },
        visible: { type: 'boolean' },
      },
      required: ['txID', 'raw_data_hex'],
    },
    publicKey: { type: 'string' },
  },
  required: ['transaction', 'publicKey'],
}

export class TronV3SerializerCompanion implements AirGapV3SerializerCompanion {
  public readonly schemas: V3SchemaConfiguration[] = [
    { type: 'TransactionSignRequest', schema: { schema: TRON_SIGN_REQUEST_SCHEMA }, protocolIdentifier: 'tron' },
    { type: 'TransactionSignRequest', schema: { schema: TRON_SIGN_REQUEST_SCHEMA }, protocolIdentifier: 'tron-trc20-usdt' },
    { type: 'TransactionSignResponse', schema: { schema: TRON_SIGN_REQUEST_SCHEMA }, protocolIdentifier: 'tron' },
    { type: 'TransactionSignResponse', schema: { schema: TRON_SIGN_REQUEST_SCHEMA }, protocolIdentifier: 'tron-trc20-usdt' },
  ] as unknown as V3SchemaConfiguration[]

  async toTransactionSignRequest(
    _identifier: string,
    unsignedTransaction: UnsignedTransaction,
    publicKey: string,
    callbackUrl?: string,
  ): Promise<TransactionSignRequest> {
    return { transaction: unsignedTransaction, publicKey, callbackURL: callbackUrl }
  }

  async fromTransactionSignRequest(
    _identifier: string,
    transactionSignRequest: TransactionSignRequest,
  ): Promise<UnsignedTransaction> {
    return transactionSignRequest.transaction as UnsignedTransaction
  }

  async validateTransactionSignRequest(_identifier: string, request: TransactionSignRequest): Promise<boolean> {
    const tx = request?.transaction as { txID?: string; raw_data_hex?: string } | undefined
    return !!tx && typeof tx.raw_data_hex === 'string' && tx.raw_data_hex.length > 0
  }

  async toTransactionSignResponse(
    _identifier: string,
    signedTransaction: SignedTransaction,
    accountIdentifier: string,
  ): Promise<TransactionSignResponse> {
    return { transaction: signedTransaction, accountIdentifier, from: [] } as unknown as TransactionSignResponse
  }

  async fromTransactionSignResponse(
    _identifier: string,
    transactionSignResponse: TransactionSignResponse,
  ): Promise<SignedTransaction> {
    return transactionSignResponse.transaction as unknown as SignedTransaction
  }

  async validateTransactionSignResponse(_identifier: string, response: TransactionSignResponse): Promise<boolean> {
    const tx = (response as unknown as { transaction?: { signature?: string[] } }).transaction
    return !!tx && Array.isArray(tx.signature) && tx.signature.length > 0
  }
}
