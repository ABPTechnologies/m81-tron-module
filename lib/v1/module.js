"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TronModule = void 0;
const TronProtocol_1 = require("./protocol/TronProtocol");
const TronUSDTProtocol_1 = require("./protocol/TronUSDTProtocol");
const TronScanBlockExplorer_1 = require("./block-explorer/TronScanBlockExplorer");
const v3_1 = require("./serializer/v3");
const NETWORKS = {
    mainnet: TronProtocol_1.TRON_MAINNET_NETWORK,
    nile: TronProtocol_1.TRON_NILE_NETWORK,
};
const ONLINE_NETWORKS = { type: 'online', networks: NETWORKS };
const FULL = {
    type: 'full',
    offline: { type: 'offline' },
    online: ONLINE_NETWORKS,
};
class TronModule {
    constructor() {
        this.supportedProtocols = {
            tron: FULL,
            'tron-trc20-usdt': FULL,
        };
    }
    async createOfflineProtocol(identifier) {
        return this.protocolFor(identifier, TronProtocol_1.TRON_MAINNET_NETWORK);
    }
    async createOnlineProtocol(identifier, networkOrId) {
        const network = this.resolveNetwork(networkOrId);
        return this.protocolFor(identifier, network);
    }
    async createBlockExplorer(_identifier, networkOrId) {
        const network = this.resolveNetwork(networkOrId);
        return new TronScanBlockExplorer_1.TronScanBlockExplorer(network.blockExplorerUrl);
    }
    async createV3SerializerCompanion() {
        return new v3_1.TronV3SerializerCompanion();
    }
    resolveNetwork(networkOrId) {
        if (!networkOrId)
            return TronProtocol_1.TRON_MAINNET_NETWORK;
        if (typeof networkOrId === 'string')
            return NETWORKS[networkOrId] ?? TronProtocol_1.TRON_MAINNET_NETWORK;
        return networkOrId;
    }
    protocolFor(identifier, network) {
        switch (identifier) {
            case 'tron':
                return new TronProtocol_1.TronProtocol(network);
            case 'tron-trc20-usdt':
                return new TronUSDTProtocol_1.TronUSDTProtocol(network);
            default:
                return undefined;
        }
    }
}
exports.TronModule = TronModule;
