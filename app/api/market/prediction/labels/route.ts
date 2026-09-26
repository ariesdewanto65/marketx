import { NextResponse } from "next/server"

import {
  supabaseServer,
} from "@/lib/supabase/server"

import {
  buildMarketFeatures,
} from "@/lib/market/feature-engine"

import {
  buildPredictionLabels,
} from "@/lib/market/prediction-label-engine"

export const dynamic = "force-dynamic"

export async function GET(
  request: Request
) {
  const { searchParams } =
    new URL(request.url)

  const symbol =
    searchParams
      .get("symbol")
      ?.trim()
      .toUpperCase() || "BTC"

  const assetType =
    searchParams
      .get("assetType")
      ?.trim()
      .toLowerCase() || "crypto"

  const timeframe =
    searchParams
      .get("timeframe")
      ?.trim()
      .toLowerCase() || "4h"

  const horizon =
    Number(
      searchParams.get(
        "horizon"
      ) || "6"
    )

  const threshold =
    Number(
      searchParams.get(
        "threshold"
      ) || "0.5"
    )

  if (
    assetType !== "stock" &&
    assetType !== "crypto"
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          "assetType must be stock or crypto",
      },
      {
        status: 400,
      }
    )
  }

  if (
    timeframe !== "1d" &&
    timeframe !== "4h"
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          "timeframe must be 1d or 4h",
      },
      {
        status: 400,
      }
    )
  }

  if (
    !Number.isInteger(horizon) ||
    horizon <= 0
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          "horizon must be a positive integer",
      },
      {
        status: 400,
      }
    )
  }

  if (
    !Number.isFinite(threshold) ||
    threshold < 0
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          "threshold must be a non-negative number",
      },
      {
        status: 400,
      }
    )
  }

  try {
    const { data, error } =
      await supabaseServer
        .from("market_candles")
        .select(
          "asset_type, symbol, timeframe, timestamp, open, high, low, close, volume"
        )
        .eq(
          "asset_type",
          assetType
        )
        .eq(
          "symbol",
          symbol
        )
        .eq(
          "timeframe",
          timeframe
        )
        .order(
          "timestamp",
          {
            ascending: true,
          }
        )

    if (error) {
      console.error(
        "Prediction candle query error:",
        error.message
      )

      return NextResponse.json(
        {
          success: false,
          error:
            "Failed to load candle data",
        },
        {
          status: 500,
        }
      )
    }

    const candles =
      (data ?? []).map(
        (row) => ({
          assetType:
            row.asset_type,
          symbol:
            row.symbol,
          timeframe:
            row.timeframe,
          timestamp:
            row.timestamp,
          open:
            Number(row.open),
          high:
            Number(row.high),
          low:
            Number(row.low),
          close:
            Number(row.close),
          volume:
            row.volume !== null
              ? Number(row.volume)
              : null,
        })
      )

    const features =
      buildMarketFeatures(
        candles
      )

    const labels =
      buildPredictionLabels(
        features,
        horizon,
        threshold
      )

    const counts = {
      UP: labels.filter(
        (label) =>
          label.direction === "UP"
      ).length,

      DOWN: labels.filter(
        (label) =>
          label.direction === "DOWN"
      ).length,

      NEUTRAL: labels.filter(
        (label) =>
          label.direction ===
          "NEUTRAL"
      ).length,
    }

    return NextResponse.json({
      success: true,

      assetType,
      symbol,
      timeframe,

      candleCount:
        candles.length,

      featureCount:
        features.length,

      labelCount:
        labels.length,

      horizonCandles:
        horizon,

      thresholdPercent:
        threshold,

      distribution:
        counts,

      labels,

      first:
        labels[0] ?? null,

      middle:
        labels[
          Math.floor(
            labels.length / 2
          )
        ] ?? null,

      last:
        labels[
          labels.length - 1
        ] ?? null,
    })
  } catch (error) {
    console.error(
      "Prediction label API exception:",
      error
    )

    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to build prediction labels",
      },
      {
        status: 500,
      }
    )
  }
}
