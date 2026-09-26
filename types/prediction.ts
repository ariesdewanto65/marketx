import type {
  MarketFeature,
} from "@/types/feature"

export type PredictionDirection =
  | "UP"
  | "DOWN"
  | "NEUTRAL"

export interface PredictionLabel {
  assetType: MarketFeature["assetType"]
  symbol: string
  timeframe: MarketFeature["timeframe"]

  timestamp: string

  horizonCandles: number

  currentClose: number
  futureTimestamp: string
  futureClose: number

  futureReturnPercent: number

  direction: PredictionDirection
}
