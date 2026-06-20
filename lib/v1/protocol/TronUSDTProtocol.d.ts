/**
 * TronUSDTProtocol — TRC-20 USDT as a token protocol on TronProtocol. This is the
 * m81 settlement asset (USDT, contract TR7N…LJ6t, 6 decimals). Reuses the parent's
 * secp256k1 keypair/address/signing; overrides balance + transfer building to go
 * through the USDT contract via TronGrid.
 */
import { ProtocolMetadata, ProtocolNetwork, PublicKey, Balance, Amount, TransactionDetails, TransactionFullConfiguration, UnsignedTransaction } from '@airgap/module-kit';
import { TronProtocol } from './TronProtocol';
export declare class TronUSDTProtocol extends TronProtocol {
    private readonly contract;
    constructor(network?: ProtocolNetwork, apiKey?: string, contract?: string);
    getMetadata(): Promise<ProtocolMetadata>;
    getBalanceOfPublicKey(publicKey: PublicKey): Promise<Balance>;
    getTransactionMaxAmountWithPublicKey(publicKey: PublicKey, _to: string[], _configuration?: TransactionFullConfiguration): Promise<Amount>;
    prepareTransactionWithPublicKey(publicKey: PublicKey, details: TransactionDetails[], _configuration?: TransactionFullConfiguration): Promise<UnsignedTransaction>;
}
