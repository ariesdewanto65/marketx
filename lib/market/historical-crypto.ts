import type {
  MarketCandle,
  MarketTimeframe,
} from "@/types/candle"

import type {
  HistoricalMarketProvider,
} from "@/lib/market/historical-provider"

import {
  HistoricalProviderError,
} from "@/lib/market/historical-errors"

type CoinGeckoOhlcRow = [
  number,
  number,
  number,
  number,
  number
]

type CoinGeckoOhlcResponse =
  CoinGeckoOhlcRow[]

const COIN_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
}

export class CoinGeckoHistoricalProvider
  implements HistoricalMarketProvider
{
  async getHistoricalCandles(
    symbol: string,
    timeframe: MarketTimeframe
  ): Promise<MarketCandle[]> {
    if (timeframe !== "4h") {
      throw new HistoricalProviderError(
        `CoinGecko Demo historical provider currently supports 4h candles, not ${timeframe}`,
        "NO_DATA"
      )
    }

    const apiKey =
      process.env.COINGECKO_API_KEY

    if (!apiKey) {
      throw new HistoricalProviderError(
        "COINGECKO_API_KEY is not configured",
        "UPSTREAM_ERROR"
      )
    }

    const normalizedSymbol =
      symbol.trim().toUpperCase()

    const coinId =
      COIN_IDS[normalizedSymbol]

    if (!coinId) {
      throw new HistoricalProviderError(
        `Unsupported crypto symbol: ${normalizedSymbol}`,
        "NO_DATA"
      )
    }

    const url = new URL(
      `https://api.coingecko.com/api/v3/coins/${coinId}/ohlc`
    )

    url.searchParams.set(
      "vs_currency",
      "usd"
    )

    url.searchParams.set(
      "days",
      "30"
    )

    const response = await fetch(url, {
      headers: {
        "x-cg-demo-api-key": apiKey,
      },
      cache: "no-store",
    })

    if (response.status === 429) {
      throw new HistoricalProviderError(
        "CoinGecko rate limit reached",
        "RATE_LIMIT"
      )
    }

    if (!response.ok) {
      throw new HistoricalProviderError(
        `CoinGecko request failed: ${response.status}`,
        "UPSTREAM_ERROR"
      )
    }

    const data =
      (await response.json()) as CoinGeckoOhlcResponse

    if (
      !Array.isArray(data) ||
      data.length === 0
    ) {
      throw new HistoricalProviderError(
        `No historical data returned for ${normalizedSymbol}`,
        "NO_DATA"
      )
    }

    const candles: MarketCandle[] = []

    for (const row of data) {
      if (row.length !== 5) {
        throw new HistoricalProviderError(
          `Invalid OHLC data for ${normalizedSymbol}`,
          "INVALID_DATA"
        )
      }

      const [
        timestampMs,
        open,
        high,
        low,
        close,
      ] = row

      if (
        !Number.isFinite(timestampMs) ||
        !Number.isFinite(open) ||
        !Number.isFinite(high) ||
        !Number.isFinite(low) ||
        !Number.isFinite(close)
      ) {
        throw new HistoricalProviderError(
          `Invalid historical candle data for ${normalizedSymbol}`,
          "INVALID_DATA"
        )
      }

      if (
        high < open ||
        high < close ||
        high < low ||
        low > open ||
        low > close
      ) {
        throw new HistoricalProviderError(
          `Invalid OHLC relationship for ${normalizedSymbol}`,
          "INVALID_DATA"
        )
      }

      candles.push({
        assetType: "crypto",
        symbol: normalizedSymbol,
        timeframe: "4h",
        timestamp:
          new Date(
            timestampMs
          ).toISOString(),
        open,
        high,
        low,
        close,
        volume: null,
      })
    }

    candles.sort(
      (a, b) =>
        new Date(
          a.timestamp
        ).getTime() -
        new Date(
          b.timestamp
        ).getTime()
    )

    return candles
  }
}
