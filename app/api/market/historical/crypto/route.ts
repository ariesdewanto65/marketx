import { NextResponse } from "next/server"

import {
  CoinGeckoHistoricalProvider,
} from "@/lib/market/historical-crypto"

export const dynamic = "force-dynamic"

const provider =
  new CoinGeckoHistoricalProvider()

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

  try {
    const candles =
      await provider.getHistoricalCandles(
        symbol,
        "4h"
      )

    return NextResponse.json({
      success: true,
      symbol,
      timeframe: "4h",
      count: candles.length,
      first:
        candles[0] ?? null,
      last:
        candles[candles.length - 1] ?? null,
    })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error"

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      {
        status: 502,
      }
    )
  }
}
