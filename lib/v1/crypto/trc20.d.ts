/** Mainnet USDT (Tether) TRC-20 contract — 6 decimals. */
export declare const USDT_TRC20_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
export declare const USDT_DECIMALS = 6;
/** ABI `parameter` for transfer(address,uint256) — 64 bytes, no function selector. */
export declare function encodeTransferParams(toBase58: string, amountBaseUnits: string | bigint): string;
/** ABI `parameter` for balanceOf(address). */
export declare function encodeBalanceOfParams(ownerBase58: string): string;
export declare const TRANSFER_SELECTOR = "transfer(address,uint256)";
export declare const BALANCE_OF_SELECTOR = "balanceOf(address)";
/** Convert a human USDT amount (e.g. "12.5") to 6-decimal base units. */
export declare function usdtToBaseUnits(human: string): bigint;
/** Convert 6-decimal base units back to a human string. */
export declare function baseUnitsToUsdt(base: string | bigint): string;
