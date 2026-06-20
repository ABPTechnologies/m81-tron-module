/**
 * TronModule — the AirGap module entrypoint. Registers the native Tron protocol,
 * the USDT TRC-20 token protocol, and the TronScan block explorer for mainnet
 * (and Nile testnet for pre-flight verification).
 *
 * Conformed to @airgap/module-kit@0.13.46 — built as a normal importable module
 * (registered via the wallet's modulesService.init([...])), NOT a sideloaded zip
 * (the web/PWA build cannot sideload).
 */
import { AirGapModule, AirGapOfflineProtocol, AirGapOnlineProtocol, AirGapBlockExplorer, AirGapV3SerializerCompanion, ProtocolConfiguration } from '@airgap/module-kit';
export declare class TronModule implements AirGapModule {
    readonly supportedProtocols: Record<string, ProtocolConfiguration>;
    createOfflineProtocol(identifier: string): Promise<AirGapOfflineProtocol | undefined>;
    createOnlineProtocol(identifier: string, networkOrId?: unknown): Promise<AirGapOnlineProtocol | undefined>;
    createBlockExplorer(_identifier: string, networkOrId?: unknown): Promise<AirGapBlockExplorer | undefined>;
    createV3SerializerCompanion(): Promise<AirGapV3SerializerCompanion>;
    private resolveNetwork;
    private protocolFor;
}
