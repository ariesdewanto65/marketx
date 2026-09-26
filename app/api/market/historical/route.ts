import { NextResponse } from "next/server"

import {
  AlphaVantageHistoricalProvider,
} from "@/lib/market/historical-stocks"

import {
  CoinGeckoHistoricalProvider,
} from "@/lib/market/historical-crypto"

import {
  HistoricalMarketService,
} from "@/lib/market/historical-service"

export const dynamic = "force-dynamic"

const stockProvider =
  new AlphaVantageHistoricalProvider()

const cryptoProvider =
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
      .toUpperCase()

  const assetType =
    searchParams
      .get("assetType")
      ?.trim()
      .toLowerCase()

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

  const provider =
    assetType === "crypto"
      ? cryptoProvider
      : stockProvider

  const timeframe =
    assetType === "crypto"
      ? "4h"
      : "1d"

  const historicalService =
    new HistoricalMarketService(
      provider
    )

  try {
    const result =
      await historicalService
        .syncHistoricalCandles(
          symbol,
          timeframe
        )

    return NextResponse.json({
      success: true,
      assetType,
      symbol: result.symbol,
      timeframe: result.timeframe,
      fetched: result.fetched,
      saved: result.saved,
      first:
        result.candles[0] ?? null,
      last:
        result.candles[
          result.candles.length - 1
        ] ?? null,
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
