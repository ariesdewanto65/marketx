import type { MarketFeature } from "@/types/feature"
import type { PredictionDirection } from "@/types/prediction"

export interface AnalystPrediction {
  prediction: PredictionDirection
  probabilities: {
    DOWN: number
    NEUTRAL: number
    UP: number
  }
  model: string
  calibration: string
}

export interface AnalystInput {
  market: MarketFeature
  prediction: AnalystPrediction
}

export interface AnalystOutput {
  marketState: string
  trendState: string
  momentumState: string
  volatilityState: string
  rsiState: string
  macdState: string
  bollingerState: string
  mlState: string
  confluence: string[]
  riskFactors: string[]
  uncertainty: string
  summary: string
}

function classifyTrend(feature: MarketFeature): string {
  if (
    feature.sma20 !== null &&
    feature.ema20 !== null &&
    feature.close > feature.sma20 &&
    feature.close > feature.ema20
  ) {
    return "BULLISH_TREND"
  }

  if (
    feature.sma20 !== null &&
    feature.ema20 !== null &&
    feature.close < feature.sma20 &&
    feature.close < feature.ema20
  ) {
    return "BEARISH_TREND"
  }

  return "MIXED_TREND"
}

function classifyMomentum(feature: MarketFeature): string {
  if (feature.momentum14 === null) {
    return "MOMENTUM_UNAVAILABLE"
  }

  if (feature.momentum14 > 0) {
    return "POSITIVE_MOMENTUM"
  }

  if (feature.momentum14 < 0) {
    return "NEGATIVE_MOMENTUM"
  }

  return "NEUTRAL_MOMENTUM"
}

function classifyRSI(feature: MarketFeature): string {
  if (feature.rsi14 === null) {
    return "RSI_UNAVAILABLE"
  }

  if (feature.rsi14 >= 70) {
    return "OVERBOUGHT"
  }

  if (feature.rsi14 <= 30) {
    return "OVERSOLD"
  }

  return "NEUTRAL_RSI"
}

function classifyMACD(feature: MarketFeature): string {
  if (
    feature.macd === null ||
    feature.macdSignal === null ||
    feature.macdHistogram === null
  ) {
    return "MACD_UNAVAILABLE"
  }

  if (
    feature.macd > feature.macdSignal &&
    feature.macdHistogram > 0
  ) {
    return "BULLISH_MACD"
  }

  if (
    feature.macd < feature.macdSignal &&
    feature.macdHistogram < 0
  ) {
    return "BEARISH_MACD"
  }

  return "MIXED_MACD"
}

function classifyBollinger(feature: MarketFeature): string {
  if (
    feature.bollingerUpper20 === null ||
    feature.bollingerMiddle20 === null ||
    feature.bollingerLower20 === null
  ) {
    return "BOLLINGER_UNAVAILABLE"
  }

  if (feature.close >= feature.bollingerUpper20) {
    return "UPPER_BAND"
  }

  if (feature.close <= feature.bollingerLower20) {
    return "LOWER_BAND"
  }

  if (feature.close > feature.bollingerMiddle20) {
    return "ABOVE_MIDDLE"
  }

  if (feature.close < feature.bollingerMiddle20) {
    return "BELOW_MIDDLE"
  }

  return "AT_MIDDLE"
}

function classifyVolatility(feature: MarketFeature): string {
  if (feature.volatility20 === null) {
    return "VOLATILITY_UNAVAILABLE"
  }

  if (feature.volatility20 >= 0.02) {
    return "HIGH_VOLATILITY"
  }

  if (feature.volatility20 <= 0.005) {
    return "LOW_VOLATILITY"
  }

  return "MODERATE_VOLATILITY"
}

function getSelectedProbability(
  prediction: AnalystPrediction
): number {
  return prediction.probabilities[prediction.prediction]
}

function buildConfluence(
  trendState: string,
  momentumState: string,
  macdState: string,
  prediction: AnalystPrediction
): string[] {
  const factors: string[] = []

  if (
    trendState === "BULLISH_TREND" &&
    momentumState === "POSITIVE_MOMENTUM"
  ) {
    factors.push(
      "Trend and momentum are aligned bullishly."
    )
  }

  if (
    trendState === "BEARISH_TREND" &&
    momentumState === "NEGATIVE_MOMENTUM"
  ) {
    factors.push(
      "Trend and momentum are aligned bearishly."
    )
  }

  if (
    macdState === "BULLISH_MACD" &&
    prediction.prediction === "UP"
  ) {
    factors.push(
      "MACD state agrees with the ML UP classification."
    )
  }

  if (
    macdState === "BEARISH_MACD" &&
    prediction.prediction === "DOWN"
  ) {
    factors.push(
      "MACD state agrees with the ML DOWN classification."
    )
  }

  if (factors.length === 0) {
    factors.push(
      "Technical signals are mixed and do not form a strong confluence."
    )
  }

  return factors
}

function buildRiskFactors(
  rsiState: string,
  volatilityState: string,
  bollingerState: string,
  prediction: AnalystPrediction
): string[] {
  const risks: string[] = []

  if (rsiState === "OVERBOUGHT") {
    risks.push("RSI is in the overbought zone.")
  }

  if (rsiState === "OVERSOLD") {
    risks.push("RSI is in the oversold zone.")
  }

  if (volatilityState === "HIGH_VOLATILITY") {
    risks.push("Market volatility is elevated.")
  }

  if (
    bollingerState === "UPPER_BAND" ||
    bollingerState === "LOWER_BAND"
  ) {
    risks.push(
      "Price is at a Bollinger Band boundary."
    )
  }

  const probabilities = Object.values(
    prediction.probabilities
  )

  const maxProbability = Math.max(...probabilities)
  const minProbability = Math.min(...probabilities)

  if (maxProbability - minProbability < 0.10) {
    risks.push(
      "ML probabilities are closely clustered."
    )
  }

  if (risks.length === 0) {
    risks.push(
      "No major rule-based risk flag detected."
    )
  }

  return risks
}

export function analyzeMarket(
  input: AnalystInput
): AnalystOutput {
  const {
    market,
    prediction,
  } = input

  const trendState = classifyTrend(market)
  const momentumState = classifyMomentum(market)
  const rsiState = classifyRSI(market)
  const macdState = classifyMACD(market)
  const bollingerState = classifyBollinger(market)
  const volatilityState = classifyVolatility(market)

  const marketState =
    market.returnPercent !== null &&
    market.returnPercent > 0
      ? "POSITIVE"
      : market.returnPercent !== null &&
          market.returnPercent < 0
        ? "NEGATIVE"
        : "NEUTRAL"

  const mlState =
    prediction.prediction === "UP"
      ? "ML_BULLISH"
      : prediction.prediction === "DOWN"
        ? "ML_BEARISH"
        : "ML_NEUTRAL"

  const confluence = buildConfluence(
    trendState,
    momentumState,
    macdState,
    prediction
  )

  const riskFactors = buildRiskFactors(
    rsiState,
    volatilityState,
    bollingerState,
    prediction
  )

  const probabilities = Object.values(
    prediction.probabilities
  )

  const probabilitySpread =
    Math.max(...probabilities) -
    Math.min(...probabilities)

  const uncertainty =
    probabilitySpread < 0.10
      ? "HIGH_UNCERTAINTY"
      : probabilitySpread < 0.20
        ? "MODERATE_UNCERTAINTY"
        : "LOWER_UNCERTAINTY"

  const selectedProbability =
    getSelectedProbability(prediction)

  const summary =
    `${prediction.prediction} ML classification with ` +
    `${(selectedProbability * 100).toFixed(2)}% selected probability. ` +
    `Trend=${trendState}, Momentum=${momentumState}, ` +
    `RSI=${rsiState}, MACD=${macdState}, ` +
    `Bollinger=${bollingerState}, Volatility=${volatilityState}.`

  return {
    marketState,
    trendState,
    momentumState,
    volatilityState,
    rsiState,
    macdState,
    bollingerState,
    mlState,
    confluence,
    riskFactors,
    uncertainty,
    summary,
  }
}
