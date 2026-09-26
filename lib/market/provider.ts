import type { MarketSnapshot } from "@/types/market"

export interface MarketProvider {
  getQuote(symbol: string): Promise<MarketSnapshot>
}
