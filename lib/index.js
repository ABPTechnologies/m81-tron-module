"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidTronAddress = exports.tronAddressFromPrivateKey = exports.tronAddressFromPublicKey = exports.usdtToBaseUnits = exports.baseUnitsToUsdt = exports.USDT_DECIMALS = exports.USDT_TRC20_CONTRACT = exports.TRON_NILE_TESTNET = exports.TRON_MAINNET = exports.TronGridClient = exports.TronModule = void 0;
exports.create = create;
const module_1 = require("./v1/module");
Object.defineProperty(exports, "TronModule", { enumerable: true, get: function () { return module_1.TronModule; } });
/** AirGap isolated-module entrypoint. `manifest.json.src.namespace` resolves to this. */
function create() {
    return new module_1.TronModule();
}
// Settlement/reconciliation surface — consumed by pm-wallet to detect on-chain
// USDT-TRC20 arrivals at the m81 address (read-only TronGrid).
var trongrid_1 = require("./v1/clients/trongrid");
Object.defineProperty(exports, "TronGridClient", { enumerable: true, get: function () { return trongrid_1.TronGridClient; } });
Object.defineProperty(exports, "TRON_MAINNET", { enumerable: true, get: function () { return trongrid_1.TRON_MAINNET; } });
Object.defineProperty(exports, "TRON_NILE_TESTNET", { enumerable: true, get: function () { return trongrid_1.TRON_NILE_TESTNET; } });
var trc20_1 = require("./v1/crypto/trc20");
Object.defineProperty(exports, "USDT_TRC20_CONTRACT", { enumerable: true, get: function () { return trc20_1.USDT_TRC20_CONTRACT; } });
Object.defineProperty(exports, "USDT_DECIMALS", { enumerable: true, get: function () { return trc20_1.USDT_DECIMALS; } });
Object.defineProperty(exports, "baseUnitsToUsdt", { enumerable: true, get: function () { return trc20_1.baseUnitsToUsdt; } });
Object.defineProperty(exports, "usdtToBaseUnits", { enumerable: true, get: function () { return trc20_1.usdtToBaseUnits; } });
var tron_crypto_1 = require("./v1/crypto/tron-crypto");
Object.defineProperty(exports, "tronAddressFromPublicKey", { enumerable: true, get: function () { return tron_crypto_1.tronAddressFromPublicKey; } });
Object.defineProperty(exports, "tronAddressFromPrivateKey", { enumerable: true, get: function () { return tron_crypto_1.tronAddressFromPrivateKey; } });
Object.defineProperty(exports, "isValidTronAddress", { enumerable: true, get: function () { return tron_crypto_1.isValidTronAddress; } });
