"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { authenticatedFetch } from "@/lib/supabase/auth-fetch"

type AssetType = "stock" | "crypto" | "forex"

type Asset = {
  id: string
  symbol: string
  name: string
  type: AssetType
}

type MarketSnapshot = {
  assetId: string
  price: number
  change: number
  changePercent: number
  volume: number | null
  marketCap: number | null
  timestamp: string
}

type MarketQuoteResult = {
  data: MarketSnapshot
  source: "provider" | "memory-cache" | "persistent-cache"
}

type WatchlistItem = {
  id?: string
  symbol: string
  asset_type: AssetType
  created_at?: string
}

const STOCK_ASSETS: Asset[] = [
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

const CRYPTO_ASSETS: Asset[] = [
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

const FOREX_ASSETS: Asset[] = [
  { id: "forex:XAUUSD", symbol: "XAU/USD", name: "Gold / US Dollar", type: "forex" },
  { id: "forex:EURUSD", symbol: "EUR/USD", name: "Euro / US Dollar", type: "forex" },
  { id: "forex:GBPUSD", symbol: "GBP/USD", name: "British Pound / US Dollar", type: "forex" },
]

const ALL_ASSETS = [
  ...STOCK_ASSETS,
  ...CRYPTO_ASSETS,
  ...FOREX_ASSETS,
]

function formatPrice(
  value: number,
  type: AssetType
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: type === "crypto" && value >= 1000 ? 0 : type === "forex" ? (value >= 1000 ? 2 : 5) : 2,
  }).format(value)
}

function formatNumber(
  value: number | null
): string {
  if (value === null) {
    return "?"
  }

  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value)
}

function formatPercent(
  value: number
): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`
}

function sourceLabel(
  source: MarketQuoteResult["source"]
): string {
  if (source === "provider") {
    return "PROVIDER"
  }

  if (source === "memory-cache") {
    return "MEMORY CACHE"
  }

  return "PERSISTENT CACHE"
}

export default function Home() {
  const [marketData, setMarketData] =
    useState<Record<string, MarketQuoteResult>>({})

  const [watchlist, setWatchlist] =
    useState<WatchlistItem[]>([])

  const [loading, setLoading] =
    useState(true)

  const [refreshing, setRefreshing] =
    useState(false)

  const [watchlistLoading, setWatchlistLoading] =
    useState(false)

  const [error, setError] =
    useState<string | null>(null)

  const [watchlistSymbol, setWatchlistSymbol] =
    useState("")

  const [watchlistType, setWatchlistType] =
    useState<AssetType>("stock")

  const loadSymbol = useCallback(
    async (
      asset: Asset,
      forceRefresh = false
    ) => {
      const params = new URLSearchParams({
        symbol: asset.symbol,
        assetType: asset.type,
      })

      if (forceRefresh) {
        params.set("force", "true")
      }

      const response = await fetch(
        `/api/market?${params.toString()}`,
        {
          cache: "no-store",
        }
      )

      const result =
        (await response.json()) as
          | MarketQuoteResult
          | { error: string }

      if (!response.ok || "error" in result) {
        throw new Error(
          "error" in result
            ? result.error
            : `Failed to load ${asset.symbol}`
        )
      }

      setMarketData((current) => ({
        ...current,
        [asset.id]: result,
      }))
    },
    []
  )

  const loadAllSymbols = useCallback(
    async (forceRefresh = false) => {
      setError(null)

      if (forceRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      try {
        await Promise.all(
          ALL_ASSETS.map((asset) =>
            loadSymbol(
              asset,
              forceRefresh
            )
          )
        )
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load market data"
        )
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [loadSymbol]
  )

  const loadWatchlist =
    useCallback(async () => {
      try {
        const response =
          await authenticatedFetch(
            "/api/watchlist",
            {
              cache: "no-store",
            }
          )

        if (!response.ok) {
          const result =
            (await response.json()) as {
              error?: string
            }

          throw new Error(
            result.error ??
              "Failed to load watchlist"
          )
        }

        const result =
          (await response.json()) as {
            data?: WatchlistItem[]
          }

        setWatchlist(
          result.data ?? []
        )
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load watchlist"
        )
      }
    }, [])

  useEffect(() => {
    loadAllSymbols(false)
    loadWatchlist()

    const interval =
      window.setInterval(() => {
        loadAllSymbols(false)
      }, 60_000)

    return () => {
      window.clearInterval(interval)
    }
  }, [
    loadAllSymbols,
    loadWatchlist,
  ])

  const addToWatchlist =
    async () => {
      const symbol =
        watchlistSymbol.trim().toUpperCase()

      if (!symbol || watchlistLoading) {
        return
      }

      setError(null)
      setWatchlistLoading(true)

      try {
        const response =
          await authenticatedFetch(
            "/api/watchlist",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                symbol,
                assetType: watchlistType,
              }),
            }
          )

        const result =
          (await response.json()) as {
            data?: WatchlistItem
            error?: string
          }

        if (!response.ok) {
          throw new Error(
            result.error ??
              "Failed to add watchlist item"
          )
        }

        if (result.data) {
          setWatchlist((current) => {
            const exists =
              current.some(
                (item) =>
                  item.symbol ===
                    result.data!.symbol &&
                  item.asset_type ===
                    result.data!.asset_type
              )

            if (exists) {
              return current
            }

            return [
              ...current,
              result.data!,
            ]
          })
        }

        setWatchlistSymbol("")
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to add watchlist item"
        )
      } finally {
        setWatchlistLoading(false)
      }
    }

  const removeFromWatchlist =
    async (
      item: WatchlistItem
    ) => {
      if (watchlistLoading) {
        return
      }

      setError(null)
      setWatchlistLoading(true)

      try {
        const params =
          new URLSearchParams({
            symbol: item.symbol,
            assetType:
              item.asset_type,
          })

        const response =
          await authenticatedFetch(
            `/api/watchlist?${params.toString()}`,
            {
              method: "DELETE",
            }
          )

        const result =
          (await response.json()) as {
            error?: string
          }

        if (!response.ok) {
          throw new Error(
            result.error ??
              "Failed to remove watchlist item"
          )
        }

        setWatchlist((current) =>
          current.filter(
            (currentItem) =>
              !(
                currentItem.symbol ===
                  item.symbol &&
                currentItem.asset_type ===
                  item.asset_type
              )
          )
        )
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to remove watchlist item"
        )
      } finally {
        setWatchlistLoading(false)
      }
    }

  const renderMarketCard =
    (asset: Asset) => {
      const result =
        marketData[asset.id]

      const data =
        result?.data

      const positive =
        (data?.changePercent ?? 0) >= 0

      return (
        <div
          key={asset.id}
          className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-medium uppercase tracking-widest text-zinc-500">
                {asset.type}
              </div>

              <h3 className="mt-1 text-xl font-semibold text-white">
                {asset.symbol}
              </h3>

              <p className="text-sm text-zinc-500">
                {asset.name}
              </p>
            </div>

            <button
              onClick={() =>
                loadSymbol(asset, true)
              }
              disabled={refreshing}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-900 disabled:opacity-50"
            >
              Refresh
            </button>
          </div>

          <div className="mt-6">
            <div className="text-3xl font-semibold tracking-tight text-white">
              {data
                ? formatPrice(
                    data.price,
                    asset.type
                  )
                : "Loading..."}
            </div>

            {data && (
              <div
                className={`mt-2 text-sm font-medium ${
                  positive
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {formatPercent(
                  data.changePercent
                )}
              </div>
            )}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-zinc-800 pt-4">
            <div>
              <div className="text-xs text-zinc-500">
                24H CHANGE
              </div>

              <div className="mt-1 text-sm text-zinc-300">
                {data
                  ? asset.type === "stock"
                    ? `${
                        data.change >= 0
                          ? "+"
                          : ""
                      }${data.change.toFixed(2)}`
                    : "?"
                  : "?"}
              </div>
            </div>

            <div>
              <div className="text-xs text-zinc-500">
                VOLUME
              </div>

              <div className="mt-1 text-sm text-zinc-300">
                {formatNumber(
                  data?.volume ?? null
                )}
              </div>
            </div>

            <div>
              <div className="text-xs text-zinc-500">
                MARKET CAP
              </div>

              <div className="mt-1 text-sm text-zinc-300">
                {formatNumber(
                  data?.marketCap ?? null
                )}
              </div>
            </div>

            <div>
              <div className="text-xs text-zinc-500">
                SOURCE
              </div>

              <div className="mt-1 text-xs font-medium text-zinc-300">
                {result
                  ? sourceLabel(
                      result.source
                    )
                  : "?"}
              </div>
            </div>
          </div>
        </div>
      )
    }

  const watchlistAssets =
    useMemo(() => {
      return watchlist
        .map((item) =>
          ALL_ASSETS.find(
            (asset) =>
              asset.symbol ===
                item.symbol &&
              asset.type ===
                item.asset_type
          )
        )
        .filter(
          (
            asset
          ): asset is Asset =>
            Boolean(asset)
        )
    }, [watchlist])

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <header className="flex flex-col gap-6 border-b border-zinc-800 pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">
              MARKETX
            </div>

            <h1 className="mt-2 text-4xl font-semibold tracking-tight">
              Market Dashboard
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-zinc-500">
              Multi-asset market data terminal
              for stocks and crypto.
            </p>
          </div>

          <button
            onClick={() =>
              loadAllSymbols(true)
            }
            disabled={refreshing}
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-5 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {refreshing
              ? "Refreshing..."
              : "Refresh Market"}
          </button>
        </header>

        {error && (
          <div className="mt-6 rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <section className="mt-10">
          <div className="mb-5">
            <h2 className="text-xl font-semibold">
              Stocks
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Equity market data
            </p>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-zinc-800 p-8 text-sm text-zinc-500">
              Loading stock market data...
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {STOCK_ASSETS.map(
                renderMarketCard
              )}
            </div>
          )}
        </section>

        <section className="mt-12">
          <div className="mb-5">
            <h2 className="text-xl font-semibold">
              Crypto
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Cryptocurrency market data
            </p>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-zinc-800 p-8 text-sm text-zinc-500">
              Loading crypto market data...
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {CRYPTO_ASSETS.map(
                renderMarketCard
              )}
            </div>
          )}
        </section>

        <section className="mt-12">
          <div className="mb-5">
            <h2 className="text-xl font-semibold">
              Forex
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Foreign exchange and gold market data
            </p>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-zinc-800 p-8 text-sm text-zinc-500">
              Loading forex market data...
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {FOREX_ASSETS.map(
                renderMarketCard
              )}
            </div>
          )}
        </section>
        <section className="mt-12">
          <div className="mb-5">
            <h2 className="text-xl font-semibold">
              Watchlist
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Your saved market assets
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <div className="flex flex-col gap-3 md:flex-row">
              <select
                value={watchlistType}
                onChange={(event) =>
                  setWatchlistType(
                    event.target.value as AssetType
                  )
                }
                disabled={watchlistLoading}
                className="rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm text-white outline-none disabled:opacity-50"
              >
                <option value="stock">
                  Stock
                </option>

                <option value="crypto">
                  Crypto
                </option>
                <option value="forex">
                  Forex
                </option>
              </select>

              <input
                value={watchlistSymbol}
                onChange={(event) =>
                  setWatchlistSymbol(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter"
                  ) {
                    addToWatchlist()
                  }
                }}
                disabled={watchlistLoading}
                placeholder={
                  watchlistType === "stock"
                    ? "AAPL"
                    : "BTC"
                }
                className="flex-1 rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-700 disabled:opacity-50"
              />

              <button
                onClick={addToWatchlist}
                disabled={
                  watchlistLoading ||
                  !watchlistSymbol.trim()
                }
                className="rounded-lg bg-white px-5 py-2 text-sm font-medium text-black hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {watchlistLoading
                  ? "Saving..."
                  : "Add"}
              </button>
            </div>

            {watchlist.length === 0 ? (
              <div className="mt-6 text-sm text-zinc-600">
                No watchlist assets yet.
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {watchlist.map((item) => {
                  const asset =
                    ALL_ASSETS.find(
                      (candidate) =>
                        candidate.symbol ===
                          item.symbol &&
                        candidate.type ===
                          item.asset_type
                    )

                  const result =
                    asset
                      ? marketData[
                          asset.id
                        ]
                      : undefined

                  return (
                    <div
                      key={`${item.asset_type}:${item.symbol}`}
                      className="flex items-center justify-between rounded-xl border border-zinc-800 px-4 py-3"
                    >
                      <div>
                        <div className="font-medium">
                          {item.symbol}
                        </div>

                        <div className="text-xs uppercase text-zinc-600">
                          {item.asset_type}
                        </div>
                      </div>

                      <div className="flex items-center gap-5">
                        <div className="text-right">
                          <div className="text-sm">
                            {result
                              ? formatPrice(
                                  result.data.price,
                                  item.asset_type
                                )
                              : "—"}
                          </div>

                          <div
                            className={`text-xs ${
                              (result?.data
                                .changePercent ??
                                0) >= 0
                                ? "text-emerald-400"
                                : "text-red-400"
                            }`}
                          >
                            {result
                              ? formatPercent(
                                  result.data
                                    .changePercent
                                )
                              : "—"}
                          </div>
                        </div>

                        <button
                          onClick={() =>
                            removeFromWatchlist(
                              item
                            )
                          }
                          disabled={
                            watchlistLoading
                          }
                          className="text-xs text-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        <footer className="mt-12 border-t border-zinc-800 pt-6 text-xs text-zinc-600">
          MarketX V1 · Market Data Terminal
        </footer>
      </div>
    </main>
  )
}
