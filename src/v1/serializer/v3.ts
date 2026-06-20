/**
 * V3 serializer companion — the QR transport between the online Wallet (builds
 * the unsigned tx) and the offline Vault (signs it). For Tron the only payload
 * that must cross the air-gap is `raw_data_hex` (+ txID); the Vault hashes and
 * signs it, then the signature crosses back.
 */
import {
  AirGapV3SerializerCompanion,
  V3SchemaConfiguration,
  TransactionSignRequest,
  TransactionSignResponse,
} from '@airgap/module-kit'

export interface TronTransactionSignRequest extends TransactionSignRequest {
  transaction: { txID: string; raw_data_hex: string; raw_data?: unknown; visible?: boolean }
}

export interface TronTransactionSignResponse extends TransactionSignResponse {
  transaction: { txID: string; raw_data_hex: string; signature: string[]; visible?: boolean }
}

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
    {
      type: 'TransactionSignRequest',
      schema: { schema: TRON_SIGN_REQUEST_SCHEMA as object },
      protocolIdentifier: 'tron',
    },
    {
      type: 'TransactionSignRequest',
      schema: { schema: TRON_SIGN_REQUEST_SCHEMA as object },
      protocolIdentifier: 'tron-trc20-usdt',
    },
  ] as unknown as V3SchemaConfiguration[]

  async toTransactionSignRequest(
    _identifier: string,
    unsignedTransaction: { tron: { txID: string; raw_data_hex: string; visible?: boolean } },
    publicKey: string,
    _callbackUrl?: string,
  ): Promise<TransactionSignRequest> {
    return {
      transaction: {
        txID: unsignedTransaction.tron.txID,
        raw_data_hex: unsignedTransaction.tron.raw_data_hex,
        visible: unsignedTransaction.tron.visible,
      },
      publicKey,
    } as TronTransactionSignRequest
  }

  async fromTransactionSignRequest(
    _identifier: string,
    request: TronTransactionSignRequest,
  ): Promise<{ tron: { txID: string; raw_data_hex: string; visible?: boolean } }> {
    return { tron: { ...request.transaction } }
  }

  async toTransactionSignResponse(
    _identifier: string,
    signedTransaction: { tron: { txID: string; raw_data_hex: string; signature: string[]; visible?: boolean } },
    accountIdentifier: string,
  ): Promise<TransactionSignResponse> {
    return {
      transaction: { ...signedTransaction.tron },
      accountIdentifier,
    } as TronTransactionSignResponse
  }

  async fromTransactionSignResponse(
    _identifier: string,
    response: TronTransactionSignResponse,
  ): Promise<{ tron: { txID: string; raw_data_hex: string; signature: string[]; visible?: boolean } }> {
    return { tron: { ...response.transaction } }
  }
}
