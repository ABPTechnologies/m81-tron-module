# m81 Tron module — AirGap isolated module for Tron + TRC-20 USDT

Adds **Tron (TRX)** and **TRC-20 USDT** to the [m81 Wallet](../m81-wallet) (our fork
of AirGap Wallet) and the companion AirGap Vault. This is what lets m81 receive,
display, and later send the **USDT-TRC20** that the gerrydekens GD-VEW trading
profit settles to on-chain.

Tron is **not** natively supported by AirGap, so it ships as an *isolated module*:
a small, Ed25519-signed JS bundle the wallet loads at runtime. Nothing here touches
the wallet engine — upstream AirGap security pulls stay clean.

## Why a custom module (and the one constraint)

AirGap natively covers BTC, ETH+ERC-20, BNB Chain. USDT on Tron needs this module.
AirGap's isolated-module **sideloading is still on their `preview/isolated-modules`
branch** — so the m81 Wallet + Vault builds must track that loader to install this.
That's an app-build alignment, separate from the module itself.

## What's verified

The security-critical primitives in `src/v1/crypto/` are cross-checked against
`tronweb` and by signature recovery (`npm run verify:crypto`):

- **Address derivation** — keccak256(pubkey)[-20:] → `0x41` prefix → Base58Check.
  200/200 random keys + a known vector match tronweb.
- **TRC-20 transfer ABI** — `transfer(address,uint256)` params: 50/50 match tronweb.
- **Signing** — `txID` = SHA-256(`raw_data`), signed recoverable secp256k1 →
  65-byte `r‖s‖v`; the produced signature recovers back to the signer's address.

## Layout

```
src/index.ts                      create(): AirGapModule  (manifest src.namespace)
src/v1/module.ts                  TronModule — registers protocols + explorer + serializer
src/v1/crypto/tron-crypto.ts      address derivation + txID + sign  (VERIFIED, no TronWeb)
src/v1/crypto/trc20.ts            TRC-20 ABI encode + USDT unit math (VERIFIED)
src/v1/clients/trongrid.ts        ONLINE: balances, build transfer, broadcast
src/v1/protocol/TronProtocol.ts   native TRX protocol (offline+online), secp256k1
src/v1/protocol/TronUSDTProtocol.ts  TRC-20 USDT single-token sub-protocol (the m81 asset)
src/v1/block-explorer/…           TronScan links
src/v1/serializer/v3.ts           QR sign-request/response across the air-gap
scripts/                          build (esbuild) · keygen · sign (Ed25519) · bundle (zip)
manifest.json                     module manifest (publicKey + include + namespace)
test/verify.mjs                   the crypto cross-checks
```

## Build → sign → bundle

```bash
npm install
npm run verify:crypto      # prove the crypto core (cross-checked vs tronweb)
npm run keygen             # ONCE: make the Ed25519 signing key; paste publicKey into manifest.json
npm run bundle             # build (esbuild) → sign (Ed25519) → zip
# → m81-tron-module.zip  (sideload into m81 Wallet + AirGap Vault)
```

Install: Wallet → Settings → Isolated Modules → load `m81-tron-module.zip`;
Vault → Settings → Isolated Modules → load the same zip.

## m81 settlement use

USDT contract `TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t` (6 decimals). The treasury
withdraws GD-VEW profit from MEXC on the **TRC-20** network to the m81 Vault-held
Tron address; the wallet then shows the real on-chain USDT balance natively.

> The signing key (`module-signing.key`) is gitignored — keep it offline. The
> Vault private keys never leave the offline device; this module only builds and
> displays, and signs **inside** the Vault.
