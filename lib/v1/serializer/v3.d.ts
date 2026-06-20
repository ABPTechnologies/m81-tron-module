/**
 * V3 serializer companion — the QR transport between the online Wallet (builds the
 * unsigned tx) and the offline Vault (signs it). For Tron the only payload that
 * must cross the air-gap is `raw_data_hex` (+ txID); the Vault hashes + signs it,
 * and the signature crosses back.
 *
 * Conformed to AirGapV3SerializerCompanion@0.13.46. TransactionSignRequest/Response
 * come from @airgap/serializer (transaction payload is generic `T`).
 */
import { TransactionSignRequest, TransactionSignResponse } from '@airgap/serializer';
import { AirGapV3SerializerCompanion, V3SchemaConfiguration, UnsignedTransaction, SignedTransaction } from '@airgap/module-kit';
export declare class TronV3SerializerCompanion implements AirGapV3SerializerCompanion {
    readonly schemas: V3SchemaConfiguration[];
    toTransactionSignRequest(_identifier: string, unsignedTransaction: UnsignedTransaction, publicKey: string, callbackUrl?: string): Promise<TransactionSignRequest>;
    fromTransactionSignRequest(_identifier: string, transactionSignRequest: TransactionSignRequest): Promise<UnsignedTransaction>;
    validateTransactionSignRequest(_identifier: string, request: TransactionSignRequest): Promise<boolean>;
    toTransactionSignResponse(_identifier: string, signedTransaction: SignedTransaction, accountIdentifier: string): Promise<TransactionSignResponse>;
    fromTransactionSignResponse(_identifier: string, transactionSignResponse: TransactionSignResponse): Promise<SignedTransaction>;
    validateTransactionSignResponse(_identifier: string, response: TransactionSignResponse): Promise<boolean>;
}
