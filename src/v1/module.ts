/**
 * TronModule — the AirGap module entrypoint. Registers the native Tron protocol,
 * the USDT TRC-20 token protocol, and the TronScan block explorer for mainnet
 * (and Nile testnet for pre-flight verification).
 *
 * Conformed to @airgap/module-kit@0.13.46 — built as a normal importable module
 * (registered via the wallet's modulesService.init([...])), NOT a sideloaded zip
 * (the web/PWA build cannot sideload).
 */
import {
  AirGapModule,
  AirGapOfflineProtocol,
  AirGapOnlineProtocol,
  AirGapBlockExplorer,
  AirGapV3SerializerCompanion,
  ProtocolConfiguration,
} from '@airgap/module-kit'

import { TronProtocol, TRON_MAINNET_NETWORK, TRON_NILE_NETWORK } from './protocol/TronProtocol'
import { TronUSDTProtocol } from './protocol/TronUSDTProtocol'
import { TronScanBlockExplorer } from './block-explorer/TronScanBlockExplorer'
import { TronV3SerializerCompanion } from './serializer/v3'

const NETWORKS = {
  mainnet: TRON_MAINNET_NETWORK,
  nile: TRON_NILE_NETWORK,
}

const ONLINE_NETWORKS = { type: 'online' as const, networks: NETWORKS }
const FULL: ProtocolConfiguration = {
  type: 'full',
  offline: { type: 'offline' },
  online: ONLINE_NETWORKS,
}

export class TronModule implements AirGapModule {
  public readonly supportedProtocols: Record<string, ProtocolConfiguration> = {
    tron: FULL,
    'tron-trc20-usdt': FULL,
  }

  async createOfflineProtocol(identifier: string): Promise<AirGapOfflineProtocol | undefined> {
    return this.protocolFor(identifier, TRON_MAINNET_NETWORK)
  }

  async createOnlineProtocol(identifier: string, networkOrId?: unknown): Promise<AirGapOnlineProtocol | undefined> {
    const network = this.resolveNetwork(networkOrId)
    return this.protocolFor(identifier, network)
  }

  async createBlockExplorer(_identifier: string, networkOrId?: unknown): Promise<AirGapBlockExplorer | undefined> {
    const network = this.resolveNetwork(networkOrId)
    return new TronScanBlockExplorer(network.blockExplorerUrl)
  }

  async createV3SerializerCompanion(): Promise<AirGapV3SerializerCompanion> {
    return new TronV3SerializerCompanion()
  }

  private resolveNetwork(networkOrId?: unknown) {
    if (!networkOrId) return TRON_MAINNET_NETWORK
    if (typeof networkOrId === 'string') return NETWORKS[networkOrId as keyof typeof NETWORKS] ?? TRON_MAINNET_NETWORK
    return networkOrId as typeof TRON_MAINNET_NETWORK
  }

  private protocolFor(identifier: string, network: typeof TRON_MAINNET_NETWORK) {
    switch (identifier) {
      case 'tron':
        return new TronProtocol(network)
      case 'tron-trc20-usdt':
        return new TronUSDTProtocol(network)
      default:
        return undefined
    }
  }
}
