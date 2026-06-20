"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TronGridClient = exports.TRON_NILE_TESTNET = exports.TRON_MAINNET = void 0;
/**
 * TronGrid REST client — the ONLINE side (m81 Wallet app). Read balances, build
 * unsigned transactions, and broadcast signed ones. Holds no secrets; the offline
 * Vault signs the `txID` this client produces.
 *
 * Docs: https://developers.tron.network/reference
 */
const trc20_1 = require("../crypto/trc20");
exports.TRON_MAINNET = {
    name: 'mainnet',
    rpcUrl: 'https://api.trongrid.io',
    explorerUrl: 'https://tronscan.org',
};
exports.TRON_NILE_TESTNET = {
    name: 'nile',
    rpcUrl: 'https://nile.trongrid.io',
    explorerUrl: 'https://nile.tronscan.org',
};
class TronGridClient {
    constructor(network) {
        this.network = network;
    }
    async post(path, body) {
        const headers = { 'Content-Type': 'application/json' };
        if (this.network.apiKey)
            headers['TRON-PRO-API-KEY'] = this.network.apiKey;
        const res = await fetch(`${this.network.rpcUrl}${path}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });
        if (!res.ok)
            throw new Error(`TronGrid ${path} → HTTP ${res.status}`);
        return (await res.json());
    }
    /** Native TRX balance in SUN (1 TRX = 1e6 SUN). */
    async getTrxBalance(address) {
        const r = await this.post('/wallet/getaccount', {
            address,
            visible: true,
        });
        return BigInt(r.balance ?? 0);
    }
    /** TRC-20 USDT balance in base units (6 decimals) via a constant (read-only) call. */
    async getUsdtBalance(address, contract = trc20_1.USDT_TRC20_CONTRACT) {
        const r = await this.post('/wallet/triggerconstantcontract', {
            owner_address: address,
            contract_address: contract,
            function_selector: trc20_1.BALANCE_OF_SELECTOR,
            parameter: (0, trc20_1.encodeBalanceOfParams)(address),
            visible: true,
        });
        const word = r.constant_result?.[0];
        return word ? BigInt('0x' + word) : 0n;
    }
    /** Build an unsigned native TRX transfer (amount in SUN). */
    async createNativeTransfer(from, to, amountSun) {
        const r = await this.post('/wallet/createtransaction', {
            owner_address: from,
            to_address: to,
            amount: amountSun,
            visible: true,
        });
        if (!r.raw_data_hex)
            throw new Error(`createtransaction failed: ${r.Error ?? 'unknown'}`);
        return r;
    }
    /** Build an unsigned TRC-20 USDT transfer. Returns the tx with `raw_data_hex`. */
    async buildUsdtTransfer(from, to, amountBaseUnits, opts = {}) {
        const r = await this.post('/wallet/triggersmartcontract', {
            owner_address: from,
            contract_address: opts.contract ?? trc20_1.USDT_TRC20_CONTRACT,
            function_selector: trc20_1.TRANSFER_SELECTOR,
            parameter: (0, trc20_1.encodeTransferParams)(to, amountBaseUnits),
            fee_limit: opts.feeLimitSun ?? 100000000, // 100 TRX cap
            call_value: 0,
            visible: true,
        });
        if (!r.transaction)
            throw new Error(`build transfer failed: ${r.result?.message ?? 'unknown'}`);
        return r.transaction;
    }
    /** Broadcast a transaction that already carries its `signature[]`. */
    async broadcast(signedTx) {
        return this.post('/wallet/broadcasttransaction', signedTx);
    }
}
exports.TronGridClient = TronGridClient;
