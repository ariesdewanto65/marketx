import type {
  MarketCandle,
  MarketTimeframe,
} from "@/types/candle"

import type {
  HistoricalMarketProvider,
} from "@/lib/market/historical-provider"

import {
  supabaseServer,
} from "@/lib/supabase/server"

export interface HistoricalSyncResult {
  symbol: string
  timeframe: MarketTimeframe
  fetched: number
  saved: number
  candles: MarketCandle[]
}

export class HistoricalMarketService {
  constructor(
    private readonly provider: HistoricalMarketProvider
  ) {}

  async syncHistoricalCandles(
    symbol: string,
    timeframe: MarketTimeframe
  ): Promise<HistoricalSyncResult> {
    const normalizedSymbol =
      symbol.trim().toUpperCase()

    if (!normalizedSymbol) {
      throw new Error(
        "Market symbol is required"
      )
    }

    const candles =
      await this.provider.getHistoricalCandles(
        normalizedSymbol,
        timeframe
      )

    if (candles.length === 0) {
      return {
        symbol: normalizedSymbol,
        timeframe,
        fetched: 0,
        saved: 0,
        candles: [],
      }
    }

    const rows = candles.map(
      (candle) => ({
        asset_type:
          candle.assetType,
        symbol:
          candle.symbol,
        timeframe:
          candle.timeframe,
        timestamp:
          candle.timestamp,
        open:
          candle.open,
        high:
          candle.high,
        low:
          candle.low,
        close:
          candle.close,
        volume:
          candle.volume,
      })
    )

    const { error } =
      await supabaseServer
        .from("market_candles")
        .upsert(rows, {
          onConflict:
            "asset_type,symbol,timeframe,timestamp",
        })

    if (error) {
      console.error(
        "Failed to save historical candles:",
        error.message
      )

      throw new Error(
        `Failed to save historical candles: ${error.message}`
      )
    }

    return {
      symbol: normalizedSymbol,
      timeframe,
      fetched: candles.length,
      saved: rows.length,
      candles,
    }
  }
}
