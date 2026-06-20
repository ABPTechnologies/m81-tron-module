"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TronV3SerializerCompanion = void 0;
const TRON_SIGN_REQUEST_SCHEMA = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
        transaction: {
            type: 'object',
            properties: {
                txID: { type: 'string' },
                raw_data_hex: { type: 'string' },
                visible: { type: 'boolean' },
            },
            required: ['txID', 'raw_data_hex'],
        },
        publicKey: { type: 'string' },
    },
    required: ['transaction', 'publicKey'],
};
class TronV3SerializerCompanion {
    constructor() {
        this.schemas = [
            { type: 'TransactionSignRequest', schema: { schema: TRON_SIGN_REQUEST_SCHEMA }, protocolIdentifier: 'tron' },
            { type: 'TransactionSignRequest', schema: { schema: TRON_SIGN_REQUEST_SCHEMA }, protocolIdentifier: 'tron-trc20-usdt' },
            { type: 'TransactionSignResponse', schema: { schema: TRON_SIGN_REQUEST_SCHEMA }, protocolIdentifier: 'tron' },
            { type: 'TransactionSignResponse', schema: { schema: TRON_SIGN_REQUEST_SCHEMA }, protocolIdentifier: 'tron-trc20-usdt' },
        ];
    }
    async toTransactionSignRequest(_identifier, unsignedTransaction, publicKey, callbackUrl) {
        return { transaction: unsignedTransaction, publicKey, callbackURL: callbackUrl };
    }
    async fromTransactionSignRequest(_identifier, transactionSignRequest) {
        return transactionSignRequest.transaction;
    }
    async validateTransactionSignRequest(_identifier, request) {
        const tx = request?.transaction;
        return !!tx && typeof tx.raw_data_hex === 'string' && tx.raw_data_hex.length > 0;
    }
    async toTransactionSignResponse(_identifier, signedTransaction, accountIdentifier) {
        return { transaction: signedTransaction, accountIdentifier, from: [] };
    }
    async fromTransactionSignResponse(_identifier, transactionSignResponse) {
        return transactionSignResponse.transaction;
    }
    async validateTransactionSignResponse(_identifier, response) {
        const tx = response.transaction;
        return !!tx && Array.isArray(tx.signature) && tx.signature.length > 0;
    }
}
exports.TronV3SerializerCompanion = TronV3SerializerCompanion;
