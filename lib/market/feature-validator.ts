import type {
  MarketFeature,
} from "@/types/feature"

export interface FeatureValidationResult {
  valid: boolean
  checked: number
  invalid: number
  errors: string[]
}

function approximatelyEqual(
  a: number,
  b: number,
  tolerance = 0.000001
): boolean {
  return Math.abs(a - b) <= tolerance
}

export function validateMarketFeatures(
  features: MarketFeature[]
): FeatureValidationResult {
  const errors: string[] = []

  for (
    let index = 0;
    index < features.length;
    index++
  ) {
    const feature =
      features[index]

    const prefix =
      `${feature.symbol} ` +
      `${feature.timeframe} ` +
      `${feature.timestamp}`

    if (
      feature.rsi14 !== null &&
      (
        feature.rsi14 < 0 ||
        feature.rsi14 > 100
      )
    ) {
      errors.push(
        `${prefix}: RSI14 out of range`
      )
    }

    if (
      feature.atr14 !== null &&
      feature.atr14 <= 0
    ) {
      errors.push(
        `${prefix}: ATR14 must be positive`
      )
    }

    if (
      feature.bollingerUpper20 !== null &&
      feature.bollingerMiddle20 !== null &&
      feature.bollingerUpper20 <
        feature.bollingerMiddle20
    ) {
      errors.push(
        `${prefix}: Bollinger upper is below middle`
      )
    }

    if (
      feature.bollingerMiddle20 !== null &&
      feature.bollingerLower20 !== null &&
      feature.bollingerMiddle20 <
        feature.bollingerLower20
    ) {
      errors.push(
        `${prefix}: Bollinger middle is below lower`
      )
    }

    if (
      feature.bollingerWidth20 !== null &&
      feature.bollingerWidth20 <= 0
    ) {
      errors.push(
        `${prefix}: Bollinger width must be positive`
      )
    }

    if (
      feature.macd !== null &&
      feature.macdSignal !== null &&
      feature.macdHistogram !== null
    ) {
      const expectedHistogram =
        feature.macd -
        feature.macdSignal

      if (
        !approximatelyEqual(
          feature.macdHistogram,
          expectedHistogram
        )
      ) {
        errors.push(
          `${prefix}: MACD histogram mismatch`
        )
      }
    }

    if (
      feature.returnPercent !== null
    ) {
      if (
        index === 0
      ) {
        errors.push(
          `${prefix}: first candle cannot have a return`
        )
      }
    }
  }

  return {
    valid:
      errors.length === 0,

    checked:
      features.length,

    invalid:
      errors.length,

    errors:
      errors.slice(0, 20),
  }
}
