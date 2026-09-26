import type { AssetType, MarketSnapshot } from "@/types/market"

interface CacheEntry {
  data: MarketSnapshot
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()

const CACHE_TTL_MS = 60_000

function buildCacheKey(
  assetType: AssetType,
  symbol: string
): string {
  return `${assetType}:${symbol.trim().toUpperCase()}`
}

export function getCachedQuote(
  assetType: AssetType,
  symbol: string
): MarketSnapshot | null {
  const key = buildCacheKey(assetType, symbol)
  const entry = cache.get(key)

  if (!entry) {
    return null
  }

  if (Date.now() >= entry.expiresAt) {
    cache.delete(key)
    return null
  }

  return entry.data
}

export function setCachedQuote(
  assetType: AssetType,
  symbol: string,
  data: MarketSnapshot
): void {
  const key = buildCacheKey(assetType, symbol)

  cache.set(key, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  })
}
