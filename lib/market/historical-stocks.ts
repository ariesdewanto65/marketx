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

interface AlphaVantageDailyResponse {
  "Time Series (Daily)"?: Record<
    string,
    {
      "1. open"?: string
      "2. high"?: string
      "3. low"?: string
      "4. close"?: string
      "5. volume"?: string
    }
  >

  Note?: string
  Information?: string
  "Error Message"?: string
}

export class AlphaVantageHistoricalProvider
  implements HistoricalMarketProvider
{
  async getHistoricalCandles(
    symbol: string,
    timeframe: MarketTimeframe
  ): Promise<MarketCandle[]> {
    if (timeframe !== "1d") {
      throw new HistoricalProviderError(
        `Unsupported timeframe: ${timeframe}`,
        "NO_DATA"
      )
    }

    const apiKey =
      process.env.ALPHA_VANTAGE_API_KEY

    if (!apiKey) {
      throw new HistoricalProviderError(
        "ALPHA_VANTAGE_API_KEY is not configured",
        "UPSTREAM_ERROR"
      )
    }

    const normalizedSymbol =
      symbol.trim().toUpperCase()

    if (!normalizedSymbol) {
      throw new HistoricalProviderError(
        "Stock symbol is required",
        "NO_DATA"
      )
    }

    const url = new URL(
      "https://www.alphavantage.co/query"
    )

    url.searchParams.set(
      "function",
      "TIME_SERIES_DAILY"
    )

    url.searchParams.set(
      "symbol",
      normalizedSymbol
    )

    url.searchParams.set(
      "outputsize",
      "compact"
    )

    url.searchParams.set(
      "apikey",
      apiKey
    )

    const response = await fetch(url, {
      cache: "no-store",
    })

    if (!response.ok) {
      throw new HistoricalProviderError(
        `Alpha Vantage request failed: ${response.status}`,
        "UPSTREAM_ERROR"
      )
    }

    const data =
      (await response.json()) as AlphaVantageDailyResponse

    if (data.Note || data.Information) {
      throw new HistoricalProviderError(
        "Alpha Vantage rate limit or service message returned",
        "RATE_LIMIT"
      )
    }

    if (data["Error Message"]) {
      throw new HistoricalProviderError(
        "Alpha Vantage rejected the request",
        "UPSTREAM_ERROR"
      )
    }

    const timeSeries =
      data["Time Series (Daily)"]

    if (!timeSeries) {
      throw new HistoricalProviderError(
        `No historical data returned for ${normalizedSymbol}`,
        "NO_DATA"
      )
    }

    const candles: MarketCandle[] = []

    for (const [
      date,
      values,
    ] of Object.entries(timeSeries)) {
      const open = Number(
        values["1. open"]
      )

      const high = Number(
        values["2. high"]
      )

      const low = Number(
        values["3. low"]
      )

      const close = Number(
        values["4. close"]
      )

      const volume = Number(
        values["5. volume"]
      )

      if (
        !Number.isFinite(open) ||
        !Number.isFinite(high) ||
        !Number.isFinite(low) ||
        !Number.isFinite(close) ||
        !Number.isFinite(volume)
      ) {
        throw new HistoricalProviderError(
          `Invalid historical candle data for ${normalizedSymbol} on ${date}`,
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
          `Invalid OHLC relationship for ${normalizedSymbol} on ${date}`,
          "INVALID_DATA"
        )
      }

      candles.push({
        assetType: "stock",
        symbol: normalizedSymbol,
        timeframe: "1d",
        timestamp:
          new Date(
            `${date}T00:00:00Z`
          ).toISOString(),
        open,
        high,
        low,
        close,
        volume,
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
