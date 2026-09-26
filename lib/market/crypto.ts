import type { MarketSnapshot } from "@/types/market"
import type { MarketProvider } from "@/lib/market/provider"
import {
  MarketProviderError,
} from "@/lib/market/stocks"

interface CoinGeckoPriceData {
  usd?: number
  usd_market_cap?: number
  usd_24h_vol?: number
  usd_24h_change?: number
  last_updated_at?: number
}

type CoinGeckoResponse = Record<
  string,
  CoinGeckoPriceData
>

const COIN_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
}

export class CoinGeckoCryptoProvider
  implements MarketProvider
{
  async getQuote(
    symbol: string
  ): Promise<MarketSnapshot> {
    const apiKey =
      process.env.COINGECKO_API_KEY

    if (!apiKey) {
      throw new MarketProviderError(
        "COINGECKO_API_KEY is not configured",
        "UPSTREAM_ERROR"
      )
    }

    const normalizedSymbol =
      symbol.trim().toUpperCase()

    const coinId =
      COIN_IDS[normalizedSymbol]

    if (!coinId) {
      throw new MarketProviderError(
        `Unsupported crypto symbol: ${normalizedSymbol}`,
        "NO_DATA"
      )
    }

    const url = new URL(
      "https://api.coingecko.com/api/v3/simple/price"
    )

    url.searchParams.set(
      "ids",
      coinId
    )

    url.searchParams.set(
      "vs_currencies",
      "usd"
    )

    url.searchParams.set(
      "include_market_cap",
      "true"
    )

    url.searchParams.set(
      "include_24hr_vol",
      "true"
    )

    url.searchParams.set(
      "include_24hr_change",
      "true"
    )

    url.searchParams.set(
      "include_last_updated_at",
      "true"
    )

    const response = await fetch(
      url,
      {
        headers: {
          "x-cg-demo-api-key": apiKey,
        },
        cache: "no-store",
      }
    )

    if (response.status === 429) {
      throw new MarketProviderError(
        "CoinGecko rate limit reached",
        "RATE_LIMIT"
      )
    }

    if (!response.ok) {
      throw new MarketProviderError(
        `CoinGecko request failed: ${response.status}`,
        "UPSTREAM_ERROR"
      )
    }

    const data =
      (await response.json()) as CoinGeckoResponse

    const coin = data[coinId]

    if (!coin?.usd) {
      throw new MarketProviderError(
        `No crypto data returned for ${normalizedSymbol}`,
        "NO_DATA"
      )
    }

    return {
      assetId: `crypto:${normalizedSymbol}`,
      price: coin.usd,
      change: 0,
      changePercent:
        coin.usd_24h_change ?? 0,
      volume:
        coin.usd_24h_vol ?? null,
      marketCap:
        coin.usd_market_cap ?? null,
      timestamp: coin.last_updated_at
        ? new Date(
            coin.last_updated_at * 1000
          ).toISOString()
        : new Date().toISOString(),
    }
  }
}
