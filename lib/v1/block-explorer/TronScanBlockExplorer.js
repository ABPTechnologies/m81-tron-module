"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TronScanBlockExplorer = void 0;
class TronScanBlockExplorer {
    constructor(baseUrl = 'https://tronscan.org') {
        this.baseUrl = baseUrl;
    }
    async getMetadata() {
        return { name: 'TronScan', url: this.baseUrl };
    }
    async createAddressUrl(address) {
        return `${this.baseUrl}/#/address/${address}`;
    }
    async createTransactionUrl(transactionId) {
        return `${this.baseUrl}/#/transaction/${transactionId}`;
    }
}
exports.TronScanBlockExplorer = TronScanBlockExplorer;
