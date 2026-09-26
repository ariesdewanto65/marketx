import { NextResponse } from "next/server"

import {
  supabaseServer,
} from "@/lib/supabase/server"

import type {
  MarketTimeframe,
} from "@/types/candle"

export const dynamic = "force-dynamic"

type AssetType =
  | "stock"
  | "crypto"

function normalizeAssetType(
  value: string | null
): AssetType | null {
  if (
    value === "stock" ||
    value === "crypto"
  ) {
    return value
  }

  return null
}

function normalizeTimeframe(
  value: string | null
): MarketTimeframe | null {
  if (
    value === "1d" ||
    value === "4h"
  ) {
    return value
  }

  return null
}

export async function GET(
  request: Request
) {
  const { searchParams } =
    new URL(request.url)

  const symbol =
    searchParams
      .get("symbol")
      ?.trim()
      .toUpperCase()

  const assetType =
    normalizeAssetType(
      searchParams.get("assetType")
    )

  const timeframe =
    normalizeTimeframe(
      searchParams.get("timeframe")
    )

  const limitText =
    searchParams.get("limit")

  const requestedLimit =
    limitText
      ? Number(limitText)
      : 500

  const limit =
    Number.isFinite(requestedLimit)
      ? Math.min(
          Math.max(
            Math.floor(
              requestedLimit
            ),
            1
          ),
          1000
        )
      : 500

  if (!symbol) {
    return NextResponse.json(
      {
        success: false,
        error: "Symbol is required",
      },
      {
        status: 400,
      }
    )
  }

  if (!assetType) {
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

  if (!timeframe) {
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
          "Stock historical data currently supports 1d",
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
          "Crypto historical data currently supports 4h",
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
        .limit(limit)

    if (error) {
      console.error(
        "Historical query error:",
        error.message
      )

      return NextResponse.json(
        {
          success: false,
          error:
            "Failed to load historical data",
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

    return NextResponse.json({
      success: true,
      assetType,
      symbol,
      timeframe,
      count: candles.length,
      candles,
    })
  } catch (error) {
    console.error(
      "Historical query exception:",
      error
    )

    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to load historical data",
      },
      {
        status: 500,
      }
    )
  }
}
