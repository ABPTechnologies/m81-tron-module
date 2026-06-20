"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRON_MAINNET_VERSION_BYTE = void 0;
exports.publicKeyFromPrivateKey = publicKeyFromPrivateKey;
exports.tronAddressFromPublicKey = tronAddressFromPublicKey;
exports.tronAddressFromPrivateKey = tronAddressFromPrivateKey;
exports.tronAddressToHex = tronAddressToHex;
exports.isValidTronAddress = isValidTronAddress;
exports.txIdFromRawDataHex = txIdFromRawDataHex;
exports.signTxId = signTxId;
exports.recoverTronAddress = recoverTronAddress;
/**
 * Tron crypto core — the security-critical primitives for the m81 AirGap module.
 *
 * Verified against `tronweb` (200/200 random keys + a known vector) and by
 * recovering the signer address from a produced signature. See test/verify.mjs.
 *
 * Tron differs from Ethereum in exactly two places that matter here:
 *   1. Address encoding: keccak256(pubkey)[-20:] is prefixed with 0x41 (mainnet
 *      version byte) and Base58Check-encoded → the familiar `T...` address.
 *   2. Signing target: the `txID` is SHA-256 (NOT keccak) of the protobuf
 *      `raw_data`, signed with recoverable secp256k1 → 65 bytes r‖s‖v.
 *
 * Kept dependency-light (@noble/*) so the offline Vault bundle stays small and
 * auditable. No TronWeb in the signing path.
 */
const secp = __importStar(require("@noble/secp256k1"));
const sha3_1 = require("@noble/hashes/sha3");
const sha256_1 = require("@noble/hashes/sha256");
const hmac_1 = require("@noble/hashes/hmac");
const bs58_1 = __importDefault(require("bs58"));
// Wire RFC-6979 deterministic-k for @noble/secp256k1 v2 sync signing.
secp.etc.hmacSha256Sync = (key, ...msgs) => (0, hmac_1.hmac)(sha256_1.sha256, key, secp.etc.concatBytes(...msgs));
exports.TRON_MAINNET_VERSION_BYTE = 0x41;
const toHex = (u8) => Buffer.from(u8).toString('hex');
const fromHex = (h) => Uint8Array.from(Buffer.from(h.replace(/^0x/, ''), 'hex'));
/** Uncompressed secp256k1 public key (65 bytes, 0x04‖X‖Y) from a 32-byte private key. */
function publicKeyFromPrivateKey(privateKeyHex) {
    return secp.getPublicKey(fromHex(privateKeyHex), false);
}
/** Base58Check `T...` Tron address from a secp256k1 public key (33 or 65 bytes). */
function tronAddressFromPublicKey(publicKey) {
    // keccak over the 64-byte body (drop the 0x04 prefix on uncompressed keys).
    const body = publicKey.length === 65 ? publicKey.subarray(1) : publicKey;
    const hashed = (0, sha3_1.keccak_256)(body);
    const addr21 = new Uint8Array(21);
    addr21[0] = exports.TRON_MAINNET_VERSION_BYTE;
    addr21.set(hashed.subarray(hashed.length - 20), 1);
    const checksum = (0, sha256_1.sha256)((0, sha256_1.sha256)(addr21)).subarray(0, 4);
    const full = new Uint8Array(25);
    full.set(addr21);
    full.set(checksum, 21);
    return bs58_1.default.encode(full);
}
function tronAddressFromPrivateKey(privateKeyHex) {
    return tronAddressFromPublicKey(publicKeyFromPrivateKey(privateKeyHex));
}
/** 21-byte hex form (41‖20-byte body) that TronGrid expects when `visible:false`. */
function tronAddressToHex(base58Address) {
    const decoded = bs58_1.default.decode(base58Address);
    if (decoded.length !== 25)
        throw new Error('invalid Tron address length');
    const body = decoded.subarray(0, 21);
    const checksum = decoded.subarray(21);
    const expect = (0, sha256_1.sha256)((0, sha256_1.sha256)(body)).subarray(0, 4);
    for (let i = 0; i < 4; i++) {
        if (checksum[i] !== expect[i])
            throw new Error('invalid Tron address checksum');
    }
    return toHex(body);
}
function isValidTronAddress(base58Address) {
    try {
        tronAddressToHex(base58Address);
        return true;
    }
    catch {
        return false;
    }
}
/** txID for a transaction = SHA-256 of the protobuf-serialized `raw_data`. */
function txIdFromRawDataHex(rawDataHex) {
    return toHex((0, sha256_1.sha256)(fromHex(rawDataHex)));
}
/**
 * Sign a txID with a private key → 65-byte hex signature (r‖s‖v) as Tron expects
 * in `transaction.signature[0]`. `v` is the secp256k1 recovery id (0/1).
 * This is the only operation the offline Vault performs.
 */
function signTxId(txIdHex, privateKeyHex) {
    const sig = secp.sign(fromHex(txIdHex), fromHex(privateKeyHex)); // recoverable
    const r = sig.r.toString(16).padStart(64, '0');
    const s = sig.s.toString(16).padStart(64, '0');
    const v = sig.recovery.toString(16).padStart(2, '0');
    return r + s + v;
}
/** Recover the signer's Tron address from a txID + 65-byte signature (for verification). */
function recoverTronAddress(txIdHex, signature65Hex) {
    const r = BigInt('0x' + signature65Hex.slice(0, 64));
    const s = BigInt('0x' + signature65Hex.slice(64, 128));
    const v = parseInt(signature65Hex.slice(128, 130), 16);
    const pub = new secp.Signature(r, s, v).recoverPublicKey(fromHex(txIdHex)).toRawBytes(false);
    return tronAddressFromPublicKey(pub);
}
