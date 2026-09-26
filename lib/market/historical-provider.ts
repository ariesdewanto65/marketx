import type {
  MarketCandle,
  MarketTimeframe,
} from "@/types/candle"

export interface HistoricalMarketProvider {
  getHistoricalCandles(
    symbol: string,
    timeframe: MarketTimeframe
  ): Promise<MarketCandle[]>
}
