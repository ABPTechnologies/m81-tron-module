"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TronProtocol = exports.TRON_NILE_NETWORK = exports.TRON_MAINNET_NETWORK = void 0;
const tron_crypto_1 = require("../crypto/tron-crypto");
const trongrid_1 = require("../clients/trongrid");
exports.TRON_MAINNET_NETWORK = {
    name: 'Mainnet',
    type: 'mainnet',
    rpcUrl: 'https://api.trongrid.io',
    blockExplorerUrl: 'https://tronscan.org',
};
exports.TRON_NILE_NETWORK = {
    name: 'Nile Testnet',
    type: 'testnet',
    rpcUrl: 'https://nile.trongrid.io',
    blockExplorerUrl: 'https://nile.tronscan.org',
};
class TronProtocol {
    constructor(network = exports.TRON_MAINNET_NETWORK, apiKey) {
        this.network = network;
        this.apiKey = apiKey;
        this.client = new trongrid_1.TronGridClient({
            name: network.name,
            rpcUrl: network.rpcUrl,
            explorerUrl: network.blockExplorerUrl,
            apiKey,
        });
    }
    // ---- metadata / network ----------------------------------------------------
    async getMetadata() {
        return {
            identifier: 'tron',
            name: 'Tron',
            units: { TRX: { symbol: { value: 'TRX' }, decimals: 6 } },
            mainUnit: 'TRX',
            account: {
                standardDerivationPath: `m/44'/195'/0'/0/0`, // SLIP-0044 coin type 195
                address: { isCaseSensitive: true, placeholder: 'T…', regex: '^T[1-9A-HJ-NP-Za-km-z]{33}$' },
            },
        };
    }
    async getNetwork() {
        return this.network;
    }
    // ---- offline (Vault) -------------------------------------------------------
    async getCryptoConfiguration() {
        return { algorithm: 'secp256k1' };
    }
    async getKeyPairFromDerivative(derivative) {
        const secretKeyHex = derivative.secretKey.replace(/^0x/, '');
        const publicKeyHex = Buffer.from((0, tron_crypto_1.publicKeyFromPrivateKey)(secretKeyHex)).toString('hex');
        return {
            secretKey: { format: 'hex', value: secretKeyHex },
            publicKey: { format: 'hex', value: publicKeyHex },
        };
    }
    async getAddressFromPublicKey(publicKey) {
        return (0, tron_crypto_1.tronAddressFromPublicKey)(Uint8Array.from(Buffer.from(publicKey.value, 'hex')));
    }
    async signTransactionWithSecretKey(transaction, secretKey) {
        const tx = transaction;
        const txId = tx.txID && tx.txID.length === 64 ? tx.txID : (0, tron_crypto_1.txIdFromRawDataHex)(tx.raw_data_hex);
        const signature = (0, tron_crypto_1.signTxId)(txId, secretKey.value);
        const signed = { ...tx, txID: txId, signature: [signature] };
        return { type: 'signed', ...signed };
    }
    // ---- online (Wallet) -------------------------------------------------------
    async getBalanceOfPublicKey(publicKey) {
        const address = await this.getAddressFromPublicKey(publicKey);
        const sun = await this.client.getTrxBalance(address);
        return { total: { value: sun.toString(), unit: 'TRX' } };
    }
    async getTransactionsForPublicKey(_publicKey, _limit, cursor) {
        // History is surfaced via the block explorer link; no indexer wired here.
        return { transactions: [], cursor: { hasNext: false, ...(cursor ?? {}) } };
    }
    async getTransactionMaxAmountWithPublicKey(publicKey, _to, _configuration) {
        const { total } = await this.getBalanceOfPublicKey(publicKey);
        return total;
    }
    async getTransactionFeeWithPublicKey(_publicKey, _details, _configuration) {
        // TRX transfers are paid in bandwidth/energy; surface a conservative TRX cap.
        return {
            low: { value: '1000000', unit: 'TRX' },
            medium: { value: '1100000', unit: 'TRX' },
            high: { value: '1500000', unit: 'TRX' },
        };
    }
    async prepareTransactionWithPublicKey(publicKey, details, _configuration) {
        const from = await this.getAddressFromPublicKey(publicKey);
        const to = details[0].to;
        const amount = details[0].amount.value;
        const built = await this.buildNativeTransfer(from, to, amount);
        return { type: 'unsigned', ...built };
    }
    async broadcastTransaction(transaction) {
        const tx = transaction;
        const r = await this.client.broadcast(tx);
        if (r.result === false)
            throw new Error(`broadcast failed: ${r.message ?? 'unknown'}`);
        return r.txid ?? tx.txID;
    }
    async getDetailsFromTransaction(transaction, publicKey) {
        const from = await this.getAddressFromPublicKey(publicKey);
        const tx = transaction;
        return [
            {
                from: [from],
                to: [],
                isInbound: false,
                amount: { value: '0', unit: 'TRX' },
                fee: { value: '0', unit: 'TRX' },
                network: this.network,
                json: { txID: tx.txID },
            },
        ];
    }
    // ---- helper (overridden by the TRC-20 sub-protocol) ------------------------
    buildNativeTransfer(from, to, amountSun) {
        return this.client.createNativeTransfer(from, to, Number(amountSun));
    }
}
exports.TronProtocol = TronProtocol;
