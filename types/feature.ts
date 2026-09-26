import type {
  MarketCandle,
} from "@/types/candle"

export interface MarketFeature {
  assetType: MarketCandle["assetType"]
  symbol: string
  timeframe: MarketCandle["timeframe"]
  timestamp: string

  open: number
  high: number
  low: number
  close: number
  volume: number | null

  returnPercent: number | null
  sma20: number | null
  ema20: number | null
  momentum14: number | null
  volatility20: number | null

  rsi14: number | null
  macd: number | null
  macdSignal: number | null
  macdHistogram: number | null

  atr14: number | null

  bollingerMiddle20: number | null
  bollingerUpper20: number | null
  bollingerLower20: number | null
  bollingerWidth20: number | null
}
