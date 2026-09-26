import { NextResponse } from "next/server"

import {
  supabaseServer,
} from "@/lib/supabase/server"

import {
  buildMarketFeatures,
} from "@/lib/market/feature-engine"

import {
  validateMarketFeatures,
} from "@/lib/market/feature-validator"

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
    assetType === "stock" &&
    timeframe !== "1d"
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Stock timeframe must be 1d",
      },
      {
        status: 400,
      }
    )
  }

  if (
    assetType === "crypto" &&
    timeframe !== "4h"
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Crypto timeframe must be 4h",
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
        "Feature candle query error:",
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

    const validation =
      validateMarketFeatures(
        features
      )

    return NextResponse.json({
      success: true,

      assetType,
      symbol,
      timeframe,

      candleCount:
        candles.length,

      featureCount:
        features.length,

      validation,

      features,

      first:
        features[0] ?? null,

      twentieth:
        features[19] ?? null,

      twentyFirst:
        features[20] ?? null,

      last:
        features[
          features.length - 1
        ] ?? null,
    })
  } catch (error) {
    console.error(
      "Market feature API exception:",
      error
    )

    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to build market features",
      },
      {
        status: 500,
      }
    )
  }
}
