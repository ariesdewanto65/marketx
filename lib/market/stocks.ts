import type { MarketSnapshot } from "@/types/market"
import type { MarketProvider } from "@/lib/market/provider"

export type MarketProviderErrorCode =
  | "RATE_LIMIT"
  | "UPSTREAM_ERROR"
  | "NO_DATA"

export class MarketProviderError extends Error {
  constructor(
    message: string,
    public readonly code: MarketProviderErrorCode
  ) {
    super(message)
    this.name = "MarketProviderError"
  }
}

interface AlphaVantageQuoteResponse {
  "Global Quote"?: {
    "01. symbol"?: string
    "05. price"?: string
    "09. change"?: string
    "10. change percent"?: string
    "06. volume"?: string
  }
  Note?: string
  Information?: string
  "Error Message"?: string
}

export class AlphaVantageStockProvider implements MarketProvider {
  async getQuote(symbol: string): Promise<MarketSnapshot> {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY

    if (!apiKey) {
      throw new MarketProviderError(
        "ALPHA_VANTAGE_API_KEY is not configured",
        "UPSTREAM_ERROR"
      )
    }

    const url = new URL("https://www.alphavantage.co/query")

    url.searchParams.set("function", "GLOBAL_QUOTE")
    url.searchParams.set("symbol", symbol)
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

    const data = (await response.json()) as AlphaVantageQuoteResponse

    if (data.Note || data.Information) {
      throw new MarketProviderError(
        "Alpha Vantage rate limit or service message returned",
        "RATE_LIMIT"
      )
    }

    if (data["Error Message"]) {
      throw new MarketProviderError(
        "Alpha Vantage rejected the request",
        "UPSTREAM_ERROR"
      )
    }

    const quote = data["Global Quote"]

    if (!quote?.["01. symbol"] || !quote["05. price"]) {
      throw new MarketProviderError(
        `No quote data returned for ${symbol}`,
        "NO_DATA"
      )
    }

    const changePercentText =
      quote["10. change percent"]?.replace("%", "") ?? "0"

    return {
      assetId: `stock:${quote["01. symbol"].toUpperCase()}`,
      price: Number(quote["05. price"]),
      change: Number(quote["09. change"] ?? 0),
      changePercent: Number(changePercentText),
      volume: quote["06. volume"]
        ? Number(quote["06. volume"])
        : null,
      marketCap: null,
      timestamp: new Date().toISOString(),
    }
  }
}
