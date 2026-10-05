import type { MarketSnapshot } from "@/types/market"
import type { MarketProvider } from "@/lib/market/provider"
import { MarketProviderError } from "@/lib/market/stocks"

interface AlphaVantageForexResponse {
  "Realtime Currency Exchange Rate"?: {
    "1. From_Currency Code"?: string
    "2. From_Currency Name"?: string
    "3. To_Currency Code"?: string
    "4. To_Currency Name"?: string
    "5. Exchange Rate"?: string
    "6. Last Refreshed"?: string
    "7. Time Zone"?: string
    "8. Bid Price"?: string
    "9. Ask Price"?: string
  }
  Note?: string
  Information?: string
  "Error Message"?: string
}

interface AlphaVantageGoldResponse {
  "price"?: string
  "unit"?: string
  "timestamp"?: string
  "symbol"?: string
  Note?: string
  Information?: string
  "Error Message"?: string
}

export class AlphaVantageForexProvider implements MarketProvider {
  async getQuote(symbol: string): Promise<MarketSnapshot> {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY

    if (!apiKey) {
      throw new MarketProviderError(
        "ALPHA_VANTAGE_API_KEY is not configured",
        "UPSTREAM_ERROR"
      )
    }

    const normalized = symbol.toUpperCase().replace("/", "")

    if (normalized === "XAUUSD") {
      return this.getGoldQuote(apiKey)
    }

    if (normalized.length !== 6) {
      throw new MarketProviderError(
        `Invalid forex symbol: ${symbol}`,
        "NO_DATA"
      )
    }

    const fromCurrency = normalized.slice(0, 3)
    const toCurrency = normalized.slice(3, 6)

    const url = new URL("https://www.alphavantage.co/query")
    url.searchParams.set("function", "CURRENCY_EXCHANGE_RATE")
    url.searchParams.set("from_currency", fromCurrency)
    url.searchParams.set("to_currency", toCurrency)
    url.searchParams.set("apikey", apiKey)

    const response = await fetch(url, {
      cache: "no-store",
    })

    if (!response.ok) {
      throw new MarketProviderError(
        `Alpha Vantage request failed: ${response.status}`,
        "UPSTREAM_ERROR"
      )
    }

    const data = (await response.json()) as AlphaVantageForexResponse

    if (data.Note || data.Information) {
      throw new MarketProviderError(
        "Alpha Vantage rate limit or service message returned",
        "RATE_LIMIT"
      )
    }

    if (data["Error Message"]) {
      throw new MarketProviderError(
        "Alpha Vantage rejected the forex request",
        "UPSTREAM_ERROR"
      )
    }

    const quote = data["Realtime Currency Exchange Rate"]

    if (
      !quote?.["1. From_Currency Code"] ||
      !quote["3. To_Currency Code"] ||
      !quote["5. Exchange Rate"]
    ) {
      throw new MarketProviderError(
        `No forex quote data returned for ${symbol}`,
        "NO_DATA"
      )
    }

    const price = Number(quote["5. Exchange Rate"])

    if (!Number.isFinite(price)) {
      throw new MarketProviderError(
        `Invalid forex price returned for ${symbol}`,
        "NO_DATA"
      )
    }

    return {
      assetId: `forex:${fromCurrency}${toCurrency}`,
      price,
      change: 0,
      changePercent: 0,
      volume: null,
      marketCap: null,
      timestamp: quote["6. Last Refreshed"]
        ? new Date(quote["6. Last Refreshed"]).toISOString()
        : new Date().toISOString(),
    }
  }

  private async getGoldQuote(apiKey: string): Promise<MarketSnapshot> {
    const url = new URL("https://www.alphavantage.co/query")
    url.searchParams.set("function", "GOLD_SILVER_SPOT")
    url.searchParams.set("symbol", "XAU")
    url.searchParams.set("apikey", apiKey)

    const response = await fetch(url, {
      cache: "no-store",
    })

    if (!response.ok) {
      throw new MarketProviderError(
        `Alpha Vantage gold request failed: ${response.status}`,
        "UPSTREAM_ERROR"
      )
    }

    const data = (await response.json()) as AlphaVantageGoldResponse

    if (data.Note || data.Information) {
      throw new MarketProviderError(
        "Alpha Vantage rate limit or service message returned",
        "RATE_LIMIT"
      )
    }

    if (data["Error Message"]) {
      throw new MarketProviderError(
        "Alpha Vantage rejected the gold request",
        "UPSTREAM_ERROR"
      )
    }

    const price = Number(data.price)

    if (!Number.isFinite(price)) {
      throw new MarketProviderError(
        "No valid gold spot price returned",
        "NO_DATA"
      )
    }

    return {
      assetId: "forex:XAUUSD",
      price,
      change: 0,
      changePercent: 0,
      volume: null,
      marketCap: null,
      timestamp: data.timestamp
  ? Number.isFinite(Number(data.timestamp))
    ? new Date(Number(data.timestamp) * 1000).toISOString()
    : new Date(data.timestamp).toISOString()
  : new Date().toISOString(),    }
  }
}


