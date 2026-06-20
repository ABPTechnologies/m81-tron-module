/** TronScan block explorer for address/transaction links. */
import { AirGapBlockExplorer, BlockExplorerMetadata } from '@airgap/module-kit';
export declare class TronScanBlockExplorer implements AirGapBlockExplorer {
    private readonly baseUrl;
    constructor(baseUrl?: string);
    getMetadata(): Promise<BlockExplorerMetadata>;
    createAddressUrl(address: string): Promise<string>;
    createTransactionUrl(transactionId: string): Promise<string>;
}
