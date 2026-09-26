import type {
  MarketCandle,
} from "@/types/candle"

import type {
  MarketFeature,
} from "@/types/feature"

function calculateSMA(
  values: number[],
  period: number
): number | null {
  if (values.length < period) {
    return null
  }

  const window =
    values.slice(
      values.length - period
    )

  const sum =
    window.reduce(
      (total, value) =>
        total + value,
      0
    )

  return sum / period
}

function calculateEMA(
  values: number[],
  period: number
): number | null {
  if (values.length < period) {
    return null
  }

  const multiplier =
    2 / (period + 1)

  let ema =
    values
      .slice(0, period)
      .reduce(
        (total, value) =>
          total + value,
        0
      ) / period

  for (
    let index = period;
    index < values.length;
    index++
  ) {
    ema =
      (values[index] - ema) *
        multiplier +
      ema
  }

  return ema
}

function calculateMomentum(
  values: number[],
  period: number
): number | null {
  if (values.length <= period) {
    return null
  }

  const current =
    values[values.length - 1]

  const previous =
    values[
      values.length - 1 - period
    ]

  return current - previous
}

function calculateVolatility(
  values: number[],
  period: number
): number | null {
  if (values.length < period + 1) {
    return null
  }

  const returns: number[] = []

  const start =
    values.length - period - 1

  for (
    let index = start + 1;
    index < values.length;
    index++
  ) {
    const previous =
      values[index - 1]

    const current =
      values[index]

    if (previous <= 0) {
      return null
    }

    returns.push(
      Math.log(
        current / previous
      )
    )
  }

  const mean =
    returns.reduce(
      (total, value) =>
        total + value,
      0
    ) / returns.length

  const variance =
    returns.reduce(
      (total, value) =>
        total +
        Math.pow(
          value - mean,
          2
        ),
      0
    ) / returns.length

  return Math.sqrt(variance)
}

function calculateRSI(
  values: number[],
  period: number
): number | null {
  if (values.length <= period) {
    return null
  }

  const start =
    values.length - period - 1

  let gains = 0
  let losses = 0

  for (
    let index = start + 1;
    index < values.length;
    index++
  ) {
    const change =
      values[index] -
      values[index - 1]

    if (change > 0) {
      gains += change
    } else {
      losses += Math.abs(change)
    }
  }

  const averageGain =
    gains / period

  const averageLoss =
    losses / period

  if (averageLoss === 0) {
    return 100
  }

  const relativeStrength =
    averageGain / averageLoss

  return (
    100 -
    100 /
      (1 + relativeStrength)
  )
}

function calculateMACD(
  values: number[],
  fastPeriod: number,
  slowPeriod: number,
  signalPeriod: number
): {
  macd: number | null
  signal: number | null
  histogram: number | null
} {
  if (values.length < slowPeriod) {
    return {
      macd: null,
      signal: null,
      histogram: null,
    }
  }

  const macdValues: number[] = []

  for (
    let index = slowPeriod;
    index <= values.length;
    index++
  ) {
    const history =
      values.slice(0, index)

    const fastEMA =
      calculateEMA(
        history,
        fastPeriod
      )

    const slowEMA =
      calculateEMA(
        history,
        slowPeriod
      )

    if (
      fastEMA === null ||
      slowEMA === null
    ) {
      continue
    }

    macdValues.push(
      fastEMA - slowEMA
    )
  }

  if (macdValues.length === 0) {
    return {
      macd: null,
      signal: null,
      histogram: null,
    }
  }

  const currentMACD =
    macdValues[
      macdValues.length - 1
    ]

  if (
    macdValues.length <
    signalPeriod
  ) {
    return {
      macd: currentMACD,
      signal: null,
      histogram: null,
    }
  }

  const signal =
    calculateEMA(
      macdValues,
      signalPeriod
    )

  if (signal === null) {
    return {
      macd: currentMACD,
      signal: null,
      histogram: null,
    }
  }

  return {
    macd: currentMACD,
    signal,
    histogram:
      currentMACD - signal,
  }
}

function calculateATR(
  candles: MarketCandle[],
  period: number
): number | null {
  if (candles.length < period + 1) {
    return null
  }

  const trueRanges: number[] = []

  const start =
    candles.length - period

  for (
    let index = start;
    index < candles.length;
    index++
  ) {
    const candle =
      candles[index]

    const previousClose =
      candles[index - 1]?.close

    if (
      previousClose === undefined
    ) {
      continue
    }

    const range1 =
      candle.high -
      candle.low

    const range2 =
      Math.abs(
        candle.high -
          previousClose
      )

    const range3 =
      Math.abs(
        candle.low -
          previousClose
      )

    const trueRange =
      Math.max(
        range1,
        range2,
        range3
      )

    trueRanges.push(
      trueRange
    )
  }

  if (
    trueRanges.length <
    period
  ) {
    return null
  }

  return (
    trueRanges.reduce(
      (total, value) =>
        total + value,
      0
    ) / period
  )
}

function calculateBollingerBands(
  values: number[],
  period: number,
  standardDeviationMultiplier: number
): {
  middle: number | null
  upper: number | null
  lower: number | null
  width: number | null
} {
  if (values.length < period) {
    return {
      middle: null,
      upper: null,
      lower: null,
      width: null,
    }
  }

  const window =
    values.slice(
      values.length - period
    )

  const middle =
    window.reduce(
      (total, value) =>
        total + value,
      0
    ) / period

  const variance =
    window.reduce(
      (total, value) =>
        total +
        Math.pow(
          value - middle,
          2
        ),
      0
    ) / period

  const standardDeviation =
    Math.sqrt(variance)

  const bandOffset =
    standardDeviation *
    standardDeviationMultiplier

  const upper =
    middle + bandOffset

  const lower =
    middle - bandOffset

  const width =
    middle !== 0
      ? ((upper - lower) /
          middle) *
        100
      : null

  return {
    middle,
    upper,
    lower,
    width,
  }
}

export function buildMarketFeatures(
  candles: MarketCandle[]
): MarketFeature[] {
  if (candles.length === 0) {
    return []
  }

  const sortedCandles =
    [...candles].sort(
      (a, b) =>
        new Date(
          a.timestamp
        ).getTime() -
        new Date(
          b.timestamp
        ).getTime()
    )

  const closes =
    sortedCandles.map(
      (candle) =>
        candle.close
    )

  return sortedCandles.map(
    (candle, index) => {
      const currentClose =
        candle.close

      const previousClose =
        index > 0
          ? closes[index - 1]
          : null

      const returnPercent =
        previousClose !== null &&
        previousClose > 0
          ? ((currentClose -
              previousClose) /
              previousClose) *
            100
          : null

      const history =
        closes.slice(
          0,
          index + 1
        )

      const candleHistory =
        sortedCandles.slice(
          0,
          index + 1
        )

      const macdResult =
        calculateMACD(
          history,
          12,
          26,
          9
        )

      const bollinger =
        calculateBollingerBands(
          history,
          20,
          2
        )

      const feature: MarketFeature = {
        assetType:
          candle.assetType,

        symbol:
          candle.symbol,

        timeframe:
          candle.timeframe,

        timestamp:
          candle.timestamp,

        open:
          candle.open,

        high:
          candle.high,

        low:
          candle.low,

        close:
          candle.close,

        volume:
          candle.volume,

        returnPercent,

        sma20:
          calculateSMA(
            history,
            20
          ),

        ema20:
          calculateEMA(
            history,
            20
          ),

        momentum14:
          calculateMomentum(
            history,
            14
          ),

        volatility20:
          calculateVolatility(
            history,
            20
          ),

        rsi14:
          calculateRSI(
            history,
            14
          ),

        macd:
          macdResult.macd,

        macdSignal:
          macdResult.signal,

        macdHistogram:
          macdResult.histogram,

        atr14:
          calculateATR(
            candleHistory,
            14
          ),

        bollingerMiddle20:
          bollinger.middle,

        bollingerUpper20:
          bollinger.upper,

        bollingerLower20:
          bollinger.lower,

        bollingerWidth20:
          bollinger.width,
      }

      return feature
    }
  )
}
