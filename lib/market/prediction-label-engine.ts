import type {
  MarketFeature,
} from "@/types/feature"

import type {
  PredictionDirection,
  PredictionLabel,
} from "@/types/prediction"

function classifyDirection(
  futureReturnPercent: number,
  thresholdPercent: number
): PredictionDirection {
  if (
    futureReturnPercent >
    thresholdPercent
  ) {
    return "UP"
  }

  if (
    futureReturnPercent <
    -thresholdPercent
  ) {
    return "DOWN"
  }

  return "NEUTRAL"
}

export function buildPredictionLabels(
  features: MarketFeature[],
  horizonCandles: number,
  thresholdPercent = 0.5
): PredictionLabel[] {
  if (
    features.length === 0 ||
    horizonCandles <= 0
  ) {
    return []
  }

  const sortedFeatures =
    [...features].sort(
      (a, b) =>
        new Date(
          a.timestamp
        ).getTime() -
        new Date(
          b.timestamp
        ).getTime()
    )

  const labels: PredictionLabel[] = []

  for (
    let index = 0;
    index + horizonCandles <
    sortedFeatures.length;
    index++
  ) {
    const current =
      sortedFeatures[index]

    const future =
      sortedFeatures[
        index + horizonCandles
      ]

    if (
      current.close <= 0 ||
      future.close <= 0
    ) {
      continue
    }

    const futureReturnPercent =
      ((future.close -
        current.close) /
        current.close) *
      100

    const direction =
      classifyDirection(
        futureReturnPercent,
        thresholdPercent
      )

    labels.push({
      assetType:
        current.assetType,

      symbol:
        current.symbol,

      timeframe:
        current.timeframe,

      timestamp:
        current.timestamp,

      horizonCandles,

      currentClose:
        current.close,

      futureTimestamp:
        future.timestamp,

      futureClose:
        future.close,

      futureReturnPercent,

      direction,
    })
  }

  return labels
}
