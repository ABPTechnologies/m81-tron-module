export declare const TRON_MAINNET_VERSION_BYTE = 65;
/** Uncompressed secp256k1 public key (65 bytes, 0x04‖X‖Y) from a 32-byte private key. */
export declare function publicKeyFromPrivateKey(privateKeyHex: string): Uint8Array;
/** Base58Check `T...` Tron address from a secp256k1 public key (33 or 65 bytes). */
export declare function tronAddressFromPublicKey(publicKey: Uint8Array): string;
export declare function tronAddressFromPrivateKey(privateKeyHex: string): string;
/** 21-byte hex form (41‖20-byte body) that TronGrid expects when `visible:false`. */
export declare function tronAddressToHex(base58Address: string): string;
export declare function isValidTronAddress(base58Address: string): boolean;
/** txID for a transaction = SHA-256 of the protobuf-serialized `raw_data`. */
export declare function txIdFromRawDataHex(rawDataHex: string): string;
/**
 * Sign a txID with a private key → 65-byte hex signature (r‖s‖v) as Tron expects
 * in `transaction.signature[0]`. `v` is the secp256k1 recovery id (0/1).
 * This is the only operation the offline Vault performs.
 */
export declare function signTxId(txIdHex: string, privateKeyHex: string): string;
/** Recover the signer's Tron address from a txID + 65-byte signature (for verification). */
export declare function recoverTronAddress(txIdHex: string, signature65Hex: string): string;
