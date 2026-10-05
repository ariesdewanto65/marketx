import type { Asset } from "@/types/market"

export const MARKET_ASSETS: Asset[] = [
  {
    id: "stock:AAPL",
    symbol: "AAPL",
    name: "Apple",
    type: "stock",
  },
  {
    id: "stock:MSFT",
    symbol: "MSFT",
    name: "Microsoft",
    type: "stock",
  },
  {
    id: "stock:NVDA",
    symbol: "NVDA",
    name: "NVIDIA",
    type: "stock",
  },
]

export const CRYPTO_ASSETS: Asset[] = [
  {
    id: "crypto:BTC",
    symbol: "BTC",
    name: "Bitcoin",
    type: "crypto",
  },
  {
    id: "crypto:ETH",
    symbol: "ETH",
    name: "Ethereum",
    type: "crypto",
  },
  {
    id: "crypto:SOL",
    symbol: "SOL",
    name: "Solana",
    type: "crypto",
  },
]

export const FOREX_ASSETS: Asset[] = [
  {
    id: "forex:XAUUSD",
    symbol: "XAU/USD",
    name: "Gold / US Dollar",
    type: "forex",
  },
  {
    id: "forex:EURUSD",
    symbol: "EUR/USD",
    name: "Euro / US Dollar",
    type: "forex",
  },
  {
    id: "forex:GBPUSD",
    symbol: "GBP/USD",
    name: "British Pound / US Dollar",
    type: "forex",
  },
]
