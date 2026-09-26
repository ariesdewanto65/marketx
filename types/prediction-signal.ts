export type PredictionSignalDirection =
  | "UP"
  | "DOWN"
  | "NEUTRAL"

export interface PredictionProbabilities {
  DOWN: number
  NEUTRAL: number
  UP: number
}

export interface PredictionSignal {
  assetType: "stock" | "crypto"
  symbol: string
  timeframe: "1d" | "4h"

  timestamp: string

  horizonCandles: number
  prediction: PredictionSignalDirection

  probabilities: PredictionProbabilities

  probability: number

  model: string
  calibration: string
}
