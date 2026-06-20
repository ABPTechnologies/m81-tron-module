"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TronModule = void 0;
exports.create = create;
const module_1 = require("./v1/module");
Object.defineProperty(exports, "TronModule", { enumerable: true, get: function () { return module_1.TronModule; } });
/** AirGap isolated-module entrypoint. `manifest.json.src.namespace` resolves to this. */
function create() {
    return new module_1.TronModule();
}
