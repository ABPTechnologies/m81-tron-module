/**
 * TronModule — the AirGap isolated-module entrypoint. Registers the native Tron
 * protocol, the USDT TRC-20 sub-protocol, and the TronScan block explorer for
 * mainnet (and Nile testnet for pre-flight verification).
 */
import {
  AirGapModule,
  AirGapProtocol,
  AirGapBlockExplorer,
  AirGapV3SerializerCompanion,
  ModuleNetworkRegistry,
  ProtocolConfiguration,
  createSupportedProtocols,
} from '@airgap/module-kit'

import { TronProtocol } from './protocol/TronProtocol'
import { TronUSDTProtocol } from './protocol/TronUSDTProtocol'
import { TronScanBlockExplorer } from './block-explorer/TronScanBlockExplorer'
import { TronV3SerializerCompanion } from './serializer/v3'
import { TRON_MAINNET, TRON_NILE_TESTNET, TronNetwork } from './clients/trongrid'

const NETWORKS: Record<string, TronNetwork> = {
  mainnet: TRON_MAINNET,
  nile: TRON_NILE_TESTNET,
}

export class TronModule implements AirGapModule {
  private readonly networkRegistry = new ModuleNetworkRegistry({
    supportedNetworks: [
      { name: 'mainnet', type: 'mainnet', rpcUrl: TRON_MAINNET.rpcUrl, blockExplorerUrl: TRON_MAINNET.explorerUrl },
      { name: 'nile', type: 'testnet', rpcUrl: TRON_NILE_TESTNET.rpcUrl, blockExplorerUrl: TRON_NILE_TESTNET.explorerUrl },
    ],
  })

  readonly supportedProtocols = createSupportedProtocols(this.networkRegistry, {
    tron: { type: 'full' } as ProtocolConfiguration,
    'tron-trc20-usdt': { type: 'full' } as ProtocolConfiguration,
  })

  async createOfflineProtocol(identifier: string): Promise<AirGapProtocol | undefined> {
    return this.protocolFor(identifier, TRON_MAINNET)
  }

  async createOnlineProtocol(identifier: string, networkId?: string): Promise<AirGapProtocol | undefined> {
    const network = NETWORKS[networkId ?? 'mainnet'] ?? TRON_MAINNET
    return this.protocolFor(identifier, network)
  }

  async createBlockExplorer(_identifier: string, networkId?: string): Promise<AirGapBlockExplorer | undefined> {
    const network = NETWORKS[networkId ?? 'mainnet'] ?? TRON_MAINNET
    return new TronScanBlockExplorer(network.explorerUrl)
  }

  async createV3SerializerCompanion(): Promise<AirGapV3SerializerCompanion> {
    return new TronV3SerializerCompanion()
  }

  private protocolFor(identifier: string, network: TronNetwork): AirGapProtocol | undefined {
    switch (identifier) {
      case 'tron':
        return new TronProtocol({ network })
      case 'tron-trc20-usdt':
        return new TronUSDTProtocol({ network })
      default:
        return undefined
    }
  }
}
