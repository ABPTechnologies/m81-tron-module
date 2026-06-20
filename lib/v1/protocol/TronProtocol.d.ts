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
import { AirGapProtocol, ProtocolMetadata, ProtocolNetwork, PublicKey, SecretKey, KeyPair, CryptoConfiguration, CryptoDerivative, Amount, Balance, FeeEstimation, AirGapTransaction, AirGapTransactionsWithCursor, TransactionCursor, TransactionDetails, TransactionFullConfiguration, TransactionSimpleConfiguration, UnsignedTransaction, SignedTransaction } from '@airgap/module-kit';
import { TronGridClient, TronUnsignedTransaction } from '../clients/trongrid';
/** The Tron transaction payload we carry inside the opaque module-kit tx types. */
export interface TronTxPayload {
    txID: string;
    raw_data?: unknown;
    raw_data_hex: string;
    visible?: boolean;
    signature?: string[];
}
export declare const TRON_MAINNET_NETWORK: ProtocolNetwork;
export declare const TRON_NILE_NETWORK: ProtocolNetwork;
export declare class TronProtocol implements AirGapProtocol {
    protected readonly network: ProtocolNetwork;
    protected readonly apiKey?: string | undefined;
    protected readonly client: TronGridClient;
    constructor(network?: ProtocolNetwork, apiKey?: string | undefined);
    getMetadata(): Promise<ProtocolMetadata>;
    getNetwork(): Promise<ProtocolNetwork>;
    getCryptoConfiguration(): Promise<CryptoConfiguration>;
    getKeyPairFromDerivative(derivative: CryptoDerivative): Promise<KeyPair>;
    getAddressFromPublicKey(publicKey: PublicKey): Promise<string>;
    signTransactionWithSecretKey(transaction: UnsignedTransaction, secretKey: SecretKey): Promise<SignedTransaction>;
    getBalanceOfPublicKey(publicKey: PublicKey): Promise<Balance>;
    getTransactionsForPublicKey(_publicKey: PublicKey, _limit: number, cursor?: TransactionCursor): Promise<AirGapTransactionsWithCursor>;
    getTransactionMaxAmountWithPublicKey(publicKey: PublicKey, _to: string[], _configuration?: TransactionFullConfiguration): Promise<Amount>;
    getTransactionFeeWithPublicKey(_publicKey: PublicKey, _details: TransactionDetails[], _configuration?: TransactionSimpleConfiguration): Promise<FeeEstimation>;
    prepareTransactionWithPublicKey(publicKey: PublicKey, details: TransactionDetails[], _configuration?: TransactionFullConfiguration): Promise<UnsignedTransaction>;
    broadcastTransaction(transaction: SignedTransaction): Promise<string>;
    getDetailsFromTransaction(transaction: UnsignedTransaction | SignedTransaction, publicKey: PublicKey): Promise<AirGapTransaction[]>;
    protected buildNativeTransfer(from: string, to: string, amountSun: string): Promise<TronUnsignedTransaction>;
}
