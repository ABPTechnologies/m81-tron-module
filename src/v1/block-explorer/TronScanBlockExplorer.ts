/** TronScan block explorer for address/transaction links. */
import { AirGapBlockExplorer, BlockExplorerMetadata } from '@airgap/module-kit'

export class TronScanBlockExplorer implements AirGapBlockExplorer {
  constructor(private readonly baseUrl: string = 'https://tronscan.org') {}

  async getMetadata(): Promise<BlockExplorerMetadata> {
    return { name: 'TronScan', url: this.baseUrl } as BlockExplorerMetadata
  }

  async createAddressUrl(address: string): Promise<string> {
    return `${this.baseUrl}/#/address/${address}`
  }

  async createTransactionUrl(transactionId: string): Promise<string> {
    return `${this.baseUrl}/#/transaction/${transactionId}`
  }
}
