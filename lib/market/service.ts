import type {
  AssetType,
  MarketSnapshot,
} from "@/types/market"

import type { MarketProvider } from "@/lib/market/provider"

import {
  MARKET_ASSETS,
  CRYPTO_ASSETS,
  FOREX_ASSETS,
} from "@/lib/market/assets"

import {
  getCachedQuote,
  setCachedQuote,
} from "@/lib/market/cache"

import {
  MarketProviderError,
} from "@/lib/market/stocks"

import {
  supabaseServer,
} from "@/lib/supabase/server"

export type MarketDataSource =
  | "provider"
  | "memory-cache"
  | "persistent-cache"

export interface MarketQuoteResult {
  data: MarketSnapshot
  source: MarketDataSource
}

export class MarketService {
  constructor(
    private readonly stockProvider: MarketProvider,
    private readonly cryptoProvider: MarketProvider,
    private readonly forexProvider: MarketProvider
  ) {}

  async getStockQuote(
    symbol: string,
    options?: {
      forceRefresh?: boolean
    }
  ): Promise<MarketQuoteResult> {
    return this.getQuote(
      "stock",
      symbol,
      this.stockProvider,
      options
    )
  }

  async getCryptoQuote(
    symbol: string,
    options?: {
      forceRefresh?: boolean
    }
  ): Promise<MarketQuoteResult> {
    return this.getQuote(
      "crypto",
      symbol,
      this.cryptoProvider,
      options
    )
  }

  async getForexQuote(
    symbol: string,
    options?: {
      forceRefresh?: boolean
    }
  ): Promise<MarketQuoteResult> {
    return this.getQuote(
      "forex",
      symbol,
      this.forexProvider,
      options
    )
  }

  private async getQuote(
    assetType: AssetType,
    symbol: string,
    provider: MarketProvider,
    options?: {
      forceRefresh?: boolean
    }
  ): Promise<MarketQuoteResult> {
    const normalizedSymbol =
      symbol.trim().toUpperCase()

    const forceRefresh =
      options?.forceRefresh ?? false

    if (!normalizedSymbol) {
      throw new Error(
        "Market symbol is required"
      )
    }

    if (!forceRefresh) {
      const cachedQuote =
        getCachedQuote(
          assetType,
          normalizedSymbol
        )

      if (cachedQuote) {
        return {
          data: cachedQuote,
          source: "memory-cache",
        }
      }
    }

    try {
      const snapshot =
        await provider.getQuote(
          normalizedSymbol
        )

      setCachedQuote(
        assetType,
        normalizedSymbol,
        snapshot
      )

      await this.saveToPersistentCache(
        assetType,
        snapshot
      )

      return {
        data: snapshot,
        source: "provider",
      }
    } catch (error) {
      if (
        error instanceof MarketProviderError &&
        error.code === "RATE_LIMIT"
      ) {
        if (forceRefresh) {
          throw error
        }

        const persistentQuote =
          await this.getFromPersistentCache(
            assetType,
            normalizedSymbol
          )

        if (persistentQuote) {
          setCachedQuote(
            assetType,
            normalizedSymbol,
            persistentQuote
          )

          return {
            data: persistentQuote,
            source: "persistent-cache",
          }
        }
      }

      throw error
    }
  }

  async getMarketSnapshot(
    forceRefresh = false
  ): Promise<MarketQuoteResult[]> {
    const results: MarketQuoteResult[] = []

    for (const asset of MARKET_ASSETS) {
      const result =
        await this.getStockQuote(
          asset.symbol,
          {
            forceRefresh,
          }
        )

      results.push(result)
    }

    for (const asset of CRYPTO_ASSETS) {
      const result =
        await this.getCryptoQuote(
          asset.symbol,
          {
            forceRefresh,
          }
        )

      results.push(result)
    }


    for (const asset of FOREX_ASSETS) {
      const result =
        await this.getForexQuote(
          asset.symbol,
          {
            forceRefresh,
          }
        )

      results.push(result)
    }

    return results
  }

  private async saveToPersistentCache(
    assetType: AssetType,
    snapshot: MarketSnapshot
  ): Promise<void> {
    const symbol =
      snapshot.assetId.replace(
        /^(stock|crypto|forex):/,
        ""
      )

    const { error } =
      await supabaseServer
        .from("market_cache")
        .upsert({
          asset_type: assetType,
          symbol,
          price: snapshot.price,
          change: snapshot.change,
          change_percent:
            snapshot.changePercent,
          volume: snapshot.volume,
          market_cap: snapshot.marketCap,
          timestamp: snapshot.timestamp,
        })

    if (error) {
      console.error(
        "Failed to save market cache:",
        error.message
      )
    }
  }

  private async getFromPersistentCache(
    assetType: AssetType,
    symbol: string
  ): Promise<MarketSnapshot | null> {
    const { data, error } =
      await supabaseServer
        .from("market_cache")
        .select("*")
        .eq("asset_type", assetType)
        .eq("symbol", symbol)
        .maybeSingle()

    if (error) {
      console.error(
        "Failed to read market cache:",
        error.message
      )

      return null
    }

    if (!data) {
      return null
    }

    return {
      assetId: `${assetType}:${data.symbol}`,
      price: Number(data.price),
      change: Number(data.change),
      changePercent: Number(
        data.change_percent
      ),
      volume:
        data.volume !== null
          ? Number(data.volume)
          : null,
      marketCap:
        data.market_cap !== null
          ? Number(data.market_cap)
          : null,
      timestamp: data.timestamp,
    }
  }
}
