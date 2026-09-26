export type AssetType = "stock" | "crypto"

export interface Asset {
  id: string
  symbol: string
  name: string
  type: AssetType
}

export interface MarketSnapshot {
  assetId: string
  price: number
  change: number
  changePercent: number
  volume: number | null
  marketCap: number | null
  timestamp: string
}
