"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TronUSDTProtocol = void 0;
const TronProtocol_1 = require("./TronProtocol");
const trc20_1 = require("../crypto/trc20");
class TronUSDTProtocol extends TronProtocol_1.TronProtocol {
    constructor(network = TronProtocol_1.TRON_MAINNET_NETWORK, apiKey, contract = trc20_1.USDT_TRC20_CONTRACT) {
        super(network, apiKey);
        this.contract = contract;
    }
    async getMetadata() {
        const base = await super.getMetadata();
        return {
            ...base,
            identifier: 'tron-trc20-usdt',
            name: 'USDT (TRC-20)',
            units: { USDT: { symbol: { value: 'USDT', asset: this.contract }, decimals: trc20_1.USDT_DECIMALS } },
            mainUnit: 'USDT',
        };
    }
    async getBalanceOfPublicKey(publicKey) {
        const address = await this.getAddressFromPublicKey(publicKey);
        const base = await this.client.getUsdtBalance(address, this.contract);
        return { total: { value: base.toString(), unit: 'USDT' } };
    }
    async getTransactionMaxAmountWithPublicKey(publicKey, _to, _configuration) {
        const { total } = await this.getBalanceOfPublicKey(publicKey);
        return total;
    }
    async prepareTransactionWithPublicKey(publicKey, details, _configuration) {
        const from = await this.getAddressFromPublicKey(publicKey);
        const to = details[0].to;
        const amountBaseUnits = details[0].amount.value; // already in 6-decimal base units
        const built = await this.client.buildUsdtTransfer(from, to, amountBaseUnits, {
            contract: this.contract,
        });
        return { type: 'unsigned', ...built };
    }
}
exports.TronUSDTProtocol = TronUSDTProtocol;
