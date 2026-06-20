export interface TronNetwork {
    name: string;
    rpcUrl: string;
    explorerUrl: string;
    apiKey?: string;
}
export declare const TRON_MAINNET: TronNetwork;
export declare const TRON_NILE_TESTNET: TronNetwork;
/** The unsigned transaction shape TronGrid returns; `raw_data_hex` is what we SHA-256 → txID. */
export interface TronUnsignedTransaction {
    txID: string;
    raw_data: unknown;
    raw_data_hex: string;
    visible?: boolean;
    signature?: string[];
}
export declare class TronGridClient {
    private readonly network;
    constructor(network: TronNetwork);
    private post;
    /** Native TRX balance in SUN (1 TRX = 1e6 SUN). */
    getTrxBalance(address: string): Promise<bigint>;
    /** TRC-20 USDT balance in base units (6 decimals) via a constant (read-only) call. */
    getUsdtBalance(address: string, contract?: string): Promise<bigint>;
    /** Build an unsigned native TRX transfer (amount in SUN). */
    createNativeTransfer(from: string, to: string, amountSun: number): Promise<TronUnsignedTransaction>;
    /** Build an unsigned TRC-20 USDT transfer. Returns the tx with `raw_data_hex`. */
    buildUsdtTransfer(from: string, to: string, amountBaseUnits: string | bigint, opts?: {
        feeLimitSun?: number;
        contract?: string;
    }): Promise<TronUnsignedTransaction>;
    /** Broadcast a transaction that already carries its `signature[]`. */
    broadcast(signedTx: TronUnsignedTransaction): Promise<{
        txid?: string;
        result?: boolean;
        message?: string;
    }>;
}
