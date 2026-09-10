/**
 * TronGrid REST client — the ONLINE side (m81 Wallet app). Read balances, build
 * unsigned transactions, and broadcast signed ones. Holds no secrets; the offline
 * Vault signs the `txID` this client produces.
 *
 * Docs: https://developers.tron.network/reference
 */
import {
  USDT_TRC20_CONTRACT,
  TRANSFER_SELECTOR,
  BALANCE_OF_SELECTOR,
  encodeTransferParams,
  encodeBalanceOfParams,
} from '../crypto/trc20'

export interface TronNetwork {
  name: string
  rpcUrl: string // e.g. https://api.trongrid.io
  explorerUrl: string // e.g. https://tronscan.org
  apiKey?: string // optional TronGrid API key (TRON-PRO-API-KEY header)
}

export const TRON_MAINNET: TronNetwork = {
  name: 'mainnet',
  rpcUrl: 'https://api.trongrid.io',
  explorerUrl: 'https://tronscan.org',
}
export const TRON_NILE_TESTNET: TronNetwork = {
  name: 'nile',
  rpcUrl: 'https://nile.trongrid.io',
  explorerUrl: 'https://nile.tronscan.org',
}

/** The unsigned transaction shape TronGrid returns; `raw_data_hex` is what we SHA-256 → txID. */
export interface TronUnsignedTransaction {
  txID: string
  raw_data: unknown
  raw_data_hex: string
  visible?: boolean
  signature?: string[]
}

/** A TRC-20 transfer as returned by TronGrid's account-transactions API. */
export interface Trc20Transfer {
  txID: string
  from: string
  to: string
  value: string // base units (string)
  contract: string
  symbol: string
  decimals: number
  timestampMs: number
}

interface RawTrc20Tx {
  transaction_id: string
  from: string
  to: string
  value: string
  block_timestamp: number
  token_info?: { address?: string; symbol?: string; decimals?: number }
}

export class TronGridClient {
  constructor(private readonly network: TronNetwork) {}

  private async post<T>(path: string, body: unknown): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.network.apiKey) headers['TRON-PRO-API-KEY'] = this.network.apiKey
    const res = await fetch(`${this.network.rpcUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`TronGrid ${path} → HTTP ${res.status}`)
    return (await res.json()) as T
  }

  private async get<T>(path: string): Promise<T> {
    const headers: Record<string, string> = {}
    if (this.network.apiKey) headers['TRON-PRO-API-KEY'] = this.network.apiKey
    const res = await fetch(`${this.network.rpcUrl}${path}`, { headers })
    if (!res.ok) throw new Error(`TronGrid ${path} → HTTP ${res.status}`)
    return (await res.json()) as T
  }

  /**
   * Inbound TRC-20 transfers TO an address (newest first), for settlement
   * reconciliation. Uses TronGrid's account-transactions API. Each item carries
   * the on-chain txID, from/to, value (base units), and block timestamp (ms).
   */
  async listInboundTrc20(
    address: string,
    opts: { contract?: string; limit?: number; minTimestampMs?: number } = {},
  ): Promise<Trc20Transfer[]> {
    const params = new URLSearchParams({
      only_to: 'true',
      limit: String(opts.limit ?? 50),
      contract_address: opts.contract ?? USDT_TRC20_CONTRACT,
    })
    if (opts.minTimestampMs) params.set('min_timestamp', String(opts.minTimestampMs))
    const r = await this.get<{ data?: RawTrc20Tx[] }>(
      `/v1/accounts/${address}/transactions/trc20?${params.toString()}`,
    )
    return (r.data ?? []).map((t) => ({
      txID: t.transaction_id,
      from: t.from,
      to: t.to,
      value: t.value,
      contract: t.token_info?.address ?? opts.contract ?? USDT_TRC20_CONTRACT,
      symbol: t.token_info?.symbol ?? 'USDT',
      decimals: t.token_info?.decimals ?? 6,
      timestampMs: t.block_timestamp,
    }))
  }

  /** Native TRX balance in SUN (1 TRX = 1e6 SUN). */
  async getTrxBalance(address: string): Promise<bigint> {
    const r = await this.post<{ balance?: number }>('/wallet/getaccount', {
      address,
      visible: true,
    })
    return BigInt(r.balance ?? 0)
  }

  /** TRC-20 USDT balance in base units (6 decimals) via a constant (read-only) call. */
  async getUsdtBalance(address: string, contract = USDT_TRC20_CONTRACT): Promise<bigint> {
    const r = await this.post<{ constant_result?: string[] }>('/wallet/triggerconstantcontract', {
      owner_address: address,
      contract_address: contract,
      function_selector: BALANCE_OF_SELECTOR,
      parameter: encodeBalanceOfParams(address),
      visible: true,
    })
    const word = r.constant_result?.[0]
    return word ? BigInt('0x' + word) : 0n
  }

  /** Build an unsigned native TRX transfer (amount in SUN). */
  async createNativeTransfer(from: string, to: string, amountSun: number): Promise<TronUnsignedTransaction> {
    const r = await this.post<TronUnsignedTransaction & { Error?: string }>('/wallet/createtransaction', {
      owner_address: from,
      to_address: to,
      amount: amountSun,
      visible: true,
    })
    if (!r.raw_data_hex) throw new Error(`createtransaction failed: ${r.Error ?? 'unknown'}`)
    return r
  }

  /** Build an unsigned TRC-20 USDT transfer. Returns the tx with `raw_data_hex`. */
  async buildUsdtTransfer(
    from: string,
    to: string,
    amountBaseUnits: string | bigint,
    opts: { feeLimitSun?: number; contract?: string } = {},
  ): Promise<TronUnsignedTransaction> {
    const r = await this.post<{ transaction: TronUnsignedTransaction; result?: { result?: boolean; message?: string } }>(
      '/wallet/triggersmartcontract',
      {
        owner_address: from,
        contract_address: opts.contract ?? USDT_TRC20_CONTRACT,
        function_selector: TRANSFER_SELECTOR,
        parameter: encodeTransferParams(to, amountBaseUnits),
        fee_limit: opts.feeLimitSun ?? 100_000_000, // 100 TRX cap
        call_value: 0,
        visible: true,
      },
    )
    if (!r.transaction) throw new Error(`build transfer failed: ${r.result?.message ?? 'unknown'}`)
    return r.transaction
  }

  /** Broadcast a transaction that already carries its `signature[]`. */
  async broadcast(signedTx: TronUnsignedTransaction): Promise<{ txid?: string; result?: boolean; message?: string }> {
    return this.post('/wallet/broadcasttransaction', signedTx)
  }
}
