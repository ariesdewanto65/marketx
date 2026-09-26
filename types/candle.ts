export type MarketTimeframe =
  | "1d"
  | "4h"

export type CandleAssetType =
  | "stock"
  | "crypto"

export interface MarketCandle {
  assetType: CandleAssetType
  symbol: string
  timeframe: MarketTimeframe
  timestamp: string

  open: number
  high: number
  low: number
  close: number
  volume: number | null
}
