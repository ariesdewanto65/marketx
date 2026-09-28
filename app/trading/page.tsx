"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabaseBrowser } from "@/lib/supabase/client"

type AssetType =
  | "stock"
  | "crypto"
  | "forex"
  | "etf"
  | "index"
  | "commodity"

type Instrument = {
  id: string
  symbol: string
  name: string
  assetType: AssetType
  exchange: string | null
  region: string | null
  currency: string | null
  baseSymbol: string | null
  quoteSymbol: string | null
  provider: string | null
  providerSymbol: string | null
  active: boolean
}

const ASSET_TYPES: {
  value: AssetType
  label: string
}[] = [
  { value: "stock", label: "STOCK" },
  { value: "crypto", label: "CRYPTO" },
  { value: "forex", label: "FOREX" },
  { value: "etf", label: "ETF" },
  { value: "index", label: "INDEX" },
  { value: "commodity", label: "COMMODITY" },
]

export default function TradingPage() {
  const router = useRouter()

  const [assetType, setAssetType] =
    useState<AssetType>("crypto")

  const [search, setSearch] = useState("")
  const [instruments, setInstruments] =
    useState<Instrument[]>([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState<string | null>(null)

  const [authenticated, setAuthenticated] =
    useState(false)

  useEffect(() => {
    let mounted = true

    async function checkAuth() {
      const {
        data: { session },
      } = await supabaseBrowser.auth.getSession()

      if (!mounted) return

      if (!session) {
        router.replace("/login")
        return
      }

      setAuthenticated(true)
    }

    checkAuth()

    return () => {
      mounted = false
    }
  }, [router])

  useEffect(() => {
    if (!authenticated) return

    const controller = new AbortController()

    async function loadInstruments() {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams()

        params.set("assetType", assetType)
        params.set("limit", "100")

        if (search.trim()) {
          params.set("search", search.trim())
        }

        const response = await fetch(
          `/api/instruments?${params.toString()}`,
          {
            signal: controller.signal,
            cache: "no-store",
          }
        )

        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(
            result.error ??
              "Failed to load instruments"
          )
        }

        setInstruments(
          result.instruments ?? []
        )
      } catch (err) {
        if (
          err instanceof Error &&
          err.name === "AbortError"
        ) {
          return
        }

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load instruments"
        )

        setInstruments([])
      } finally {
        setLoading(false)
      }
    }

    loadInstruments()

    return () => {
      controller.abort()
    }
  }, [assetType, search, authenticated])

  function openInstrument(
    instrument: Instrument
  ) {
    router.push(
      `/trading/${instrument.assetType}/${encodeURIComponent(
        instrument.symbol
      )}`
    )
  }

  if (!authenticated) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-sm text-slate-400">
          Checking authentication...
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-950">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-xl font-bold tracking-wide">
              MARKETX
            </div>

            <div className="text-xs text-slate-400">
              Trading Terminal
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-2 text-xs text-slate-400">
            V5.6.3 Asset Explorer
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">
            Select Instrument
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Choose an asset class and instrument
            to open the MarketX trading terminal.
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
          {ASSET_TYPES.map((item) => {
            const active =
              assetType === item.value

            return (
              <button
                key={item.value}
                type="button"
                onClick={() =>
                  setAssetType(item.value)
                }
                className={[
                  "rounded-xl border px-4 py-3 text-sm font-semibold transition",
                  active
                    ? "border-blue-500 bg-blue-500/10 text-blue-400"
                    : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-600 hover:text-white",
                ].join(" ")}
              >
                {item.label}
              </button>
            )
          })}
        </div>

        <div className="mb-6">
          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder={`Search ${assetType} symbol or name...`}
            className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
          />
        </div>

        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">
              {assetType.toUpperCase()}
            </div>

            <div className="text-xs text-slate-500">
              {loading
                ? "Loading..."
                : `${instruments.length} instruments`}
            </div>
          </div>

          <div className="rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-xs text-slate-500">
            Instrument Registry
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-900 bg-red-950/30 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-sm text-slate-500">
            Loading instruments...
          </div>
        ) : instruments.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
            <div className="text-sm font-semibold">
              No instruments found
            </div>

            <div className="mt-2 text-xs text-slate-500">
              Try another search or asset class.
            </div>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {instruments.map(
              (instrument) => (
                <button
                  key={instrument.id}
                  type="button"
                  onClick={() =>
                    openInstrument(
                      instrument
                    )
                  }
                  className="group rounded-2xl border border-slate-800 bg-slate-900 p-5 text-left transition hover:border-blue-500 hover:bg-slate-900/80"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-lg font-bold">
                        {instrument.symbol}
                      </div>

                      <div className="mt-1 text-sm text-slate-400">
                        {instrument.name}
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-800 px-2 py-1 text-[10px] uppercase text-slate-500">
                      {instrument.assetType}
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-slate-600">
                        Exchange
                      </div>

                      <div className="mt-1 text-slate-300">
                        {instrument.exchange ??
                          "—"}
                      </div>
                    </div>

                    <div>
                      <div className="text-slate-600">
                        Currency
                      </div>

                      <div className="mt-1 text-slate-300">
                        {instrument.currency ??
                          "—"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 text-xs font-semibold text-blue-400 opacity-0 transition group-hover:opacity-100">
                    Open Terminal ?
                  </div>
                </button>
              )
            )}
          </div>
        )}
      </section>
    </main>
  )
}
