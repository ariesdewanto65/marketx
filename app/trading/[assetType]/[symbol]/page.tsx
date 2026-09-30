"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import type { MarketCandle } from "@/types/candle"
import CandlestickChart from "@/components/market/CandlestickChart"

type Instrument = {
  id: string
  symbol: string
  name: string
  assetType: string
  exchange: string | null
  region: string | null
  currency: string | null
  provider: string | null
}

type TechnicalContext = {
  returnPercent: number | null
  sma20: number | null
  ema20: number | null
  momentum14: number | null
  volatility20: number | null
  rsi14: number | null
  macd: number | null
  macdSignal: number | null
  macdHistogram: number | null
  atr14: number | null
  bollingerMiddle20: number | null
  bollingerUpper20: number | null
  bollingerLower20: number | null
  bollingerWidth20: number | null
}

type PredictionContext = {
  horizonCandles: number
  prediction: string
  probabilities: {
    DOWN: number
    NEUTRAL: number
    UP: number
  }
  probability: number
  model: string
  calibration: string
  timestamp: string
}


type PricePredictionContext = {
  currentClose: number
  predictedReturnPercent: number
  predictedClose: number
  horizonCandles: number
  horizonHours: number
  model: string
  configuration: {
    nEstimators: number
    maxDepth: number
    minSamplesLeaf: number
  }
  training: {
    featureRows: number
    alignedRows: number
  }
}
type AnalystContext = {
  marketState: string
  trendState: string
  momentumState: string
  volatilityState: string
  rsiState: string
  macdState: string
  bollingerState: string
  mlState: string
  confluence: string[]
  riskFactors: string[]
  uncertainty: string
  summary: string
}

const CRYPTO_SYMBOLS = ["BTC", "ETH", "SOL"]

function formatNumber(value: number | null, digits = 2) {
  if (value === null || !Number.isFinite(value)) {
    return "-"
  }

  return value.toLocaleString("en-US", {
    maximumFractionDigits: digits,
  })
}

function formatPercent(value: number | null, digits = 2) {
  if (value === null || !Number.isFinite(value)) {
    return "-"
  }

  return `${(value * 100).toFixed(digits)}%`
}

export default function InstrumentTerminalPage() {
  const params = useParams()
  const router = useRouter()

  const assetType = String(params.assetType)
  const symbol = String(params.symbol).toUpperCase()

  const [instrument, setInstrument] = useState<Instrument | null>(null)
  const [candles, setCandles] = useState<MarketCandle[]>([])
  const [technical, setTechnical] = useState<TechnicalContext | null>(null)
  const [prediction, setPrediction] = useState<PredictionContext | null>(null)
  const [pricePrediction, setPricePrediction] = useState<PricePredictionContext | null>(null)

  const loadPricePrediction = async () => {
    try {
      const response = await fetch("/api/market/prediction/price?symbol=" + symbol + "&assetType=" + assetType + "&timeframe=" + timeframe + "&horizon=6");
      if (!response.ok) return
      const data = await response.json()
      if (data.success && data.prediction) {
        setPricePrediction(data.prediction)
      }
    } catch (error) {
      console.error("Price prediction failed:", error)
    }
  }
  const [analyst, setAnalyst] = useState<AnalystContext | null>(null)

  const [loading, setLoading] = useState(true)
  const [chartLoading, setChartLoading] = useState(true)
  const [intelligenceLoading, setIntelligenceLoading] = useState(true)
  const [analystLoading, setAnalystLoading] = useState(true)

  const [error, setError] = useState<string | null>(null)
  const [chartError, setChartError] = useState<string | null>(null)
  const [intelligenceError, setIntelligenceError] =
    useState<string | null>(null)
  const [analystError, setAnalystError] = useState<string | null>(null)

  const timeframe =
    assetType === "crypto"
      ? "4h"
      : assetType === "stock"
        ? "1d"
        : null

  function switchCrypto(symbolToOpen: string) {
    router.push(`/trading/crypto/${symbolToOpen}`)
  }

  useEffect(() => {
    const controller = new AbortController()

    async function loadInstrument() {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(
          "/api/instruments?assetType=" +
            encodeURIComponent(assetType) +
            "&search=" +
            encodeURIComponent(symbol),
          {
            signal: controller.signal,
            cache: "no-store",
          },
        )

        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(
            result.error || "Failed to load instrument",
          )
        }

        const found = (result.instruments || []).find(
          (item: Instrument) =>
            item.symbol.toUpperCase() === symbol,
        )

        if (!found) {
          throw new Error(
            "Instrument " + symbol + " not found",
          )
        }

        setInstrument(found)
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
            : "Failed to load instrument",
        )
        setInstrument(null)
      } finally {
        setLoading(false)
      }
    }

    loadInstrument()

    return () => {
      controller.abort()
    }
  }, [assetType, symbol])

  useEffect(() => {
    setCandles([])
    setChartError(null)
    setChartLoading(true)

    if (!timeframe) {
      setChartLoading(false)
      setChartError(
        "Historical data is not available yet for this asset class.",
      )
      return
    }

    const activeTimeframe = timeframe
    const controller = new AbortController()

    async function loadHistoricalData() {
      try {
        const searchParams = new URLSearchParams({
          symbol,
          assetType,
          timeframe: activeTimeframe,
          limit: "180",
        })

        const response = await fetch(
          "/api/market/historical/data?" +
            searchParams.toString(),
          {
            signal: controller.signal,
            cache: "no-store",
          },
        )

        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(
            result.error ||
              "Failed to load historical data",
          )
        }

        setCandles(result.candles || [])
      } catch (err) {
        if (
          err instanceof Error &&
          err.name === "AbortError"
        ) {
          return
        }

        setChartError(
          err instanceof Error
            ? err.message
            : "Failed to load historical data",
        )
        setCandles([])
      } finally {
        setChartLoading(false)
      }
    }

    loadHistoricalData()

    return () => {
      controller.abort()
    }
  }, [assetType, symbol, timeframe])

  useEffect(() => {
    setTechnical(null)
    setPrediction(null)
    setIntelligenceError(null)
    setIntelligenceLoading(true)

    if (!timeframe) {
      setIntelligenceLoading(false)
      setIntelligenceError(
        "Technical intelligence is not available yet for this asset class.",
      )
      return
    }

    const activeTimeframe = timeframe
    const controller = new AbortController()

    async function loadTechnicalIntelligence() {
      try {
        const searchParams = new URLSearchParams({
          symbol,
          assetType,
          timeframe: activeTimeframe,
        })

        const response = await fetch(
          "/api/market/intelligence/context?" +
            searchParams.toString(),
          {
            signal: controller.signal,
            cache: "no-store",
          },
        )

        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(
            result.error ||
              "Failed to load market intelligence",
          )
        }

        setTechnical(
          result.context?.technical || null,
        )

        setPrediction(
          result.context?.prediction || null,
        )
      } catch (err) {
        if (
          err instanceof Error &&
          err.name === "AbortError"
        ) {
          return
        }

        setTechnical(null)
        setPrediction(null)

        setIntelligenceError(
          err instanceof Error
            ? err.message
            : "Failed to load market intelligence",
        )
      } finally {
        setIntelligenceLoading(false)
      }
    }

    loadTechnicalIntelligence()

    return () => {
      controller.abort()
    }
  }, [assetType, symbol, timeframe])

  useEffect(() => {
    setAnalyst(null)
    setAnalystError(null)
    setAnalystLoading(true)

    if (!timeframe) {
      setAnalystLoading(false)
      return
    }

    const activeTimeframe = timeframe
    const controller = new AbortController()

    async function loadAnalyst() {
      try {
        const searchParams = new URLSearchParams({
          symbol,
          assetType,
          timeframe: activeTimeframe,
        })

        const response = await fetch(
          "/api/market/intelligence/demo?" +
            searchParams.toString(),
          {
            signal: controller.signal,
            cache: "no-store",
          },
        )

        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(
            result.error ||
              "Failed to load market intelligence analyst",
          )
        }

        setAnalyst(result.analyst || null)
      } catch (err) {
        if (
          err instanceof Error &&
          err.name === "AbortError"
        ) {
          return
        }

        setAnalyst(null)

        setAnalystError(
          err instanceof Error
            ? err.message
            : "Failed to load market intelligence analyst",
        )
      } finally {
        setAnalystLoading(false)
      }
    }

    loadAnalyst()

    return () => {
      controller.abort()
    }
  }, [assetType, symbol, timeframe])

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-sm text-slate-400">
          Loading instrument...
        </div>
      </main>
    )
  }

  if (error || !instrument) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-6 text-sm text-blue-400 hover:text-blue-300"
          >
            Back to instruments
          </button>

          <div className="rounded-2xl border border-red-900 bg-red-950/30 p-6">
            <h1 className="text-xl font-bold">
              Instrument not found
            </h1>

            <p className="mt-2 text-sm text-red-400">
              {error || "Unable to load instrument"}
            </p>
          </div>
        </div>
      </main>
    )
  }

  const latestCandle =
    candles.length > 0
      ? candles[candles.length - 1]
      : null

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-xl font-bold">
              MARKETX
            </div>

            <div className="text-xs text-slate-500">
              Market Intelligence Terminal
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-2 text-xs text-slate-400 hover:text-white"
            >
              Refresh
            </button>

            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-2 text-xs text-slate-400 hover:text-white"
            >
              Back
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">
                  {instrument.symbol}
                </h1>

                <span className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-[10px] uppercase text-blue-400">
                  {instrument.assetType}
                </span>
              </div>

              <p className="mt-2 text-sm text-slate-400">
                {instrument.name}
              </p>
            </div>

            <div className="text-right text-xs text-slate-500">
              <div>
                Exchange:
                <span className="ml-1 text-slate-300">
                  {instrument.exchange || "Global"}
                </span>
              </div>

              <div className="mt-1">
                Currency:
                <span className="ml-1 text-slate-300">
                  {instrument.currency || "-"}
                </span>
              </div>

              <div className="mt-1">
                Provider:
                <span className="ml-1 text-slate-300">
                  {instrument.provider || "-"}
                </span>
              </div>
            </div>
          </div>

          {assetType === "crypto" && (
            <div className="mt-6 border-t border-slate-800 pt-5">
              <div className="mb-3 text-[10px] uppercase tracking-wide text-slate-600">
                Crypto Instruments
              </div>

              <div className="flex flex-wrap gap-2">
                {CRYPTO_SYMBOLS.map((cryptoSymbol) => {
                  const active =
                    symbol === cryptoSymbol

                  return (
                    <button
                      key={cryptoSymbol}
                      type="button"
                      onClick={() =>
                        switchCrypto(cryptoSymbol)
                      }
                      className={
                        active
                          ? "rounded-lg border border-blue-500/50 bg-blue-500/15 px-5 py-2 text-xs font-semibold text-blue-300"
                          : "rounded-lg border border-slate-800 bg-slate-950 px-5 py-2 text-xs font-semibold text-slate-400 hover:border-slate-600 hover:text-white"
                      }
                    >
                      {cryptoSymbol}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="mt-6 grid gap-3 border-t border-slate-800 pt-5 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-xl bg-slate-950 px-4 py-3">
              <div className="text-[10px] uppercase tracking-wide text-slate-600">
                Timeframe
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-200">
                {timeframe
                  ? timeframe.toUpperCase()
                  : "N/A"}
              </div>
            </div>

            <div className="rounded-xl bg-slate-950 px-4 py-3">
              <div className="text-[10px] uppercase tracking-wide text-slate-600">
                Historical
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-200">
                {candles.length} candles
              </div>
            </div>

            <div className="rounded-xl bg-slate-950 px-4 py-3">
              <div className="text-[10px] uppercase tracking-wide text-slate-600">
                Technical
              </div>
              <div className="mt-1 text-sm font-semibold text-emerald-400">
                {technical ? "READY" : "LOADING"}
              </div>
            </div>

            <div className="rounded-xl bg-slate-950 px-4 py-3">
              <div className="text-[10px] uppercase tracking-wide text-slate-600">
                ML
              </div>
              <div className="mt-1 text-sm font-semibold text-emerald-400">
                {prediction ? "READY" : "LOADING"}
              </div>
            </div>

            <div className="rounded-xl bg-slate-950 px-4 py-3">
              <div className="text-[10px] uppercase tracking-wide text-slate-600">
                Analyst
              </div>
              <div className="mt-1 text-sm font-semibold text-emerald-400">
                {analyst ? "READY" : "LOADING"}
              </div>
            </div>
          </div>
        </div>

        <section className="grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="text-xs text-slate-500">Last Price</div>
          <div className="mt-2 text-xl font-semibold text-white">
            {latestCandle ? formatNumber(latestCandle.close) : "-"}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="text-xs text-slate-500">Change</div>
          <div className="mt-2 text-xl font-semibold text-white">
            {technical?.returnPercent == null ? "-" : `${technical.returnPercent.toFixed(2)}%`}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="text-xs text-slate-500">Volume</div>
          <div className="mt-2 text-xl font-semibold text-white">
            {latestCandle?.volume == null
              ? "-"
              : formatNumber(latestCandle.volume, 0)}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="text-xs text-slate-500">Latest Candle</div>
          <div className="mt-2 text-sm font-semibold text-white">
            {latestCandle
              ? new Date(latestCandle.timestamp).toLocaleString()
              : "-"}
          </div>
        </div>
      </section>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="font-semibold">
                  Price Chart
                </div>

                <div className="text-xs text-slate-500">
                  {candles.length} candles
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-lg border border-slate-800 px-3 py-1 text-xs text-slate-400">
                  {timeframe
                    ? timeframe.toUpperCase()
                    : "N/A"}
                </span>

                <span className="rounded-lg border border-slate-800 px-3 py-1 text-xs text-slate-500">
                  HISTORICAL
                </span>
              </div>
            </div>

            {chartLoading ? (
              <div className="flex h-[500px] items-center justify-center rounded-xl border border-slate-800 bg-slate-950">
                <div className="text-sm text-slate-500">
                  Loading historical candles...
                </div>
              </div>
            ) : chartError ? (
              <div className="flex h-[500px] items-center justify-center rounded-xl border border-red-900 bg-red-950/20">
                <div className="text-center">
                  <div className="text-sm font-semibold text-red-400">
                    Historical data unavailable
                  </div>

                  <div className="mt-2 text-xs text-slate-500">
                    {chartError}
                  </div>
                </div>
              </div>
            ) : candles.length === 0 ? (
              <div className="flex h-[500px] items-center justify-center rounded-xl border border-slate-800 bg-slate-950">
                <div className="text-sm text-slate-500">
                  No historical candles found.
                </div>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
                <CandlestickChart candles={candles} />
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="font-semibold">
                Technical Intelligence
              </div>

              <div className="mt-1 text-xs text-slate-500">
                MarketX Feature Engine
              </div>

              {intelligenceLoading ? (
                <div className="mt-5 rounded-xl bg-slate-950 p-4 text-xs text-slate-500">
                  Loading technical intelligence...
                </div>
              ) : intelligenceError ? (
                <div className="mt-5 rounded-xl border border-red-900 bg-red-950/20 p-4 text-xs text-red-400">
                  {intelligenceError}
                </div>
              ) : technical ? (
                <div className="mt-5 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">
                      RSI
                    </span>
                    <span className="text-sm text-slate-200">
                      {formatNumber(technical.rsi14)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">
                      MACD
                    </span>
                    <span className="text-sm text-slate-200">
                      {formatNumber(technical.macd)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">
                      MACD Signal
                    </span>
                    <span className="text-sm text-slate-200">
                      {formatNumber(
                        technical.macdSignal,
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">
                      MACD Histogram
                    </span>
                    <span className="text-sm text-slate-200">
                      {formatNumber(
                        technical.macdHistogram,
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">
                      Momentum
                    </span>
                    <span className="text-sm text-slate-200">
                      {formatNumber(
                        technical.momentum14,
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">
                      Volatility
                    </span>
                    <span className="text-sm text-slate-200">
                      {formatPercent(
                        technical.volatility20,
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">
                      ATR
                    </span>
                    <span className="text-sm text-slate-200">
                      {formatNumber(technical.atr14)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">
                      SMA20
                    </span>
                    <span className="text-sm text-slate-200">
                      {formatNumber(technical.sma20)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">
                      EMA20
                    </span>
                    <span className="text-sm text-slate-200">
                      {formatNumber(technical.ema20)}
                    </span>
                  </div>

                  <div className="border-t border-slate-800 pt-3">
                    <div className="mb-2 text-xs text-slate-600">
                      Bollinger Bands
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-xs text-slate-500">
                          Upper
                        </span>
                        <span className="text-xs text-slate-300">
                          {formatNumber(
                            technical.bollingerUpper20,
                          )}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-xs text-slate-500">
                          Middle
                        </span>
                        <span className="text-xs text-slate-300">
                          {formatNumber(
                            technical.bollingerMiddle20,
                          )}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-xs text-slate-500">
                          Lower
                        </span>
                        <span className="text-xs text-slate-300">
                          {formatNumber(
                            technical.bollingerLower20,
                          )}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-xs text-slate-500">
                          Width
                        </span>
                        <span className="text-xs text-slate-300">
                          {formatNumber(
                            technical.bollingerWidth20,
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-xl bg-slate-950 p-4 text-xs text-slate-600">
                  No technical data available.
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="font-semibold">
                Latest Market Data
              </div>

              <div className="mt-1 text-xs text-slate-500">
                Latest historical candle
              </div>

              <div className="mt-5">
                <div className="text-2xl font-bold">
                  {latestCandle
                    ? latestCandle.close.toLocaleString(
                        "en-US",
                        {
                          maximumFractionDigits: 8,
                        },
                      )
                    : "-"}
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  Close
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="font-semibold">
                ML Prediction
              </div>

              <div className="mt-1 text-xs text-slate-500">
                MarketX Prediction Engine
              </div>

              {intelligenceLoading ? (
                <div className="mt-5 rounded-xl bg-slate-950 p-4 text-xs text-slate-500">
                  Loading prediction...
                </div>
              ) : intelligenceError ? (
                <div className="mt-5 rounded-xl border border-red-900 bg-red-950/20 p-4 text-xs text-red-400">
                  {intelligenceError}
                </div>
              ) : prediction ? (
                <div className="mt-5">
                  <div className="rounded-xl bg-slate-950 p-4">
                    <div className="text-xs text-slate-600">
                      Prediction
                    </div>

                    <div className="mt-2 text-2xl font-bold">
                      {prediction.prediction}
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                      Horizon:{" "}
                      {prediction.horizonCandles} candles
                    </div>
                  </div>

                  <div className="space-y-3">
                    {(
                      [
                        ["DOWN", prediction.probabilities.DOWN],
                        [
                          "NEUTRAL",
                          prediction.probabilities.NEUTRAL,
                        ],
                        ["UP", prediction.probabilities.UP],
                      ] as const
                    ).map(([label, probability]) => (
                      <div key={label}>
                        <div className="mb-1 flex justify-between text-xs">
                          <span className="text-slate-500">
                            {label}
                          </span>

                          <span className="text-slate-300">
                            {(probability * 100).toFixed(2)}%
                          </span>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-slate-950">
                          <div
                            className={
                              label === "DOWN"
                                ? "h-full bg-red-500"
                                : label === "UP"
                                  ? "h-full bg-emerald-500"
                                  : "h-full bg-slate-500"
                            }
                            style={{
                              width: `${probability * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-slate-800 pt-3 text-xs text-slate-600">
                    <div>
                      Model: {prediction.model}
                    </div>

                    <div className="mt-1">
                      Calibration:{" "}
                      {prediction.calibration}
                    </div>
                  </div>

                  {pricePrediction && (
                    <div className="rounded-xl bg-slate-950 p-4">
                      <div className="text-xs text-slate-600">
                        Future Close Prediction
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div className="rounded-lg border border-slate-800 p-3">
                          <div className="text-xs text-slate-500">
                            Current Close
                          </div>
                          <div className="mt-1 text-lg font-semibold">
                            {pricePrediction.currentClose.toLocaleString(
                              undefined,
                              { maximumFractionDigits: 2 },
                            )}
                          </div>
                        </div>

                        <div className="rounded-lg border border-slate-800 p-3">
                          <div className="text-xs text-slate-500">
                            Predicted Close
                          </div>
                          <div className="mt-1 text-lg font-semibold">
                            {pricePrediction.predictedClose.toLocaleString(
                              undefined,
                              { maximumFractionDigits: 2 },
                            )}
                          </div>
                        </div>

                        <div className="rounded-lg border border-slate-800 p-3">
                          <div className="text-xs text-slate-500">
                            Expected Return
                          </div>
                          <div className="mt-1 text-lg font-semibold">
                            {pricePrediction.predictedReturnPercent >= 0
                              ? "+"
                              : ""}
                            {pricePrediction.predictedReturnPercent.toFixed(2)}%
                          </div>
                        </div>

                        <div className="rounded-lg border border-slate-800 p-3">
                          <div className="text-xs text-slate-500">
                            Horizon
                          </div>
                          <div className="mt-1 text-lg font-semibold">
                            {pricePrediction.horizonCandles} candles
                          </div>
                          <div className="mt-1 text-xs text-slate-600">
                            {pricePrediction.horizonHours}h
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 border-t border-slate-800 pt-3 text-xs text-slate-600">
                        <div>
                          Model: {pricePrediction.model}
                        </div>
                        <div className="mt-1">
                          RF: {pricePrediction.configuration.nEstimators} trees - depth {pricePrediction.configuration.maxDepth} - leaf {pricePrediction.configuration.minSamplesLeaf}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-5 rounded-xl bg-slate-950 p-4 text-xs text-slate-600">
                  No prediction data available.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="font-semibold">
            Market Intelligence
          </div>

          <div className="mt-1 text-xs text-slate-500">
            MarketX Deterministic Analyst Engine
          </div>

          {analystLoading ? (
            <div className="mt-5 rounded-xl bg-slate-950 p-4 text-xs text-slate-600">
              Loading market intelligence...
            </div>
          ) : analystError ? (
            <div className="mt-5 rounded-xl border border-red-900 bg-red-950/20 p-4 text-xs text-red-400">
              {analystError}
            </div>
          ) : !analyst ? (
            <div className="mt-5 rounded-xl bg-slate-950 p-4 text-xs text-slate-600">
              No market intelligence available.
            </div>
          ) : (
            <>
              <div className="mt-5 grid gap-4 md:grid-cols-4">
                <div className="rounded-xl bg-slate-950 p-4">
                  <div className="text-xs text-slate-600">
                    Trend
                  </div>

                  <div className="mt-2 text-sm font-semibold text-slate-200">
                    {analyst.trendState}
                  </div>
                </div>

                <div className="rounded-xl bg-slate-950 p-4">
                  <div className="text-xs text-slate-600">
                    Momentum
                  </div>

                  <div className="mt-2 text-sm font-semibold text-slate-200">
                    {analyst.momentumState}
                  </div>
                </div>

                <div className="rounded-xl bg-slate-950 p-4">
                  <div className="text-xs text-slate-600">
                    Confluence
                  </div>

                  <div className="mt-2 text-sm font-semibold text-slate-200">
                    {analyst.confluence.length > 0
                      ? "DETECTED"
                      : "NONE"}
                  </div>
                </div>

                <div className="rounded-xl bg-slate-950 p-4">
                  <div className="text-xs text-slate-600">
                    Risk
                  </div>

                  <div className="mt-2 text-sm font-semibold text-slate-200">
                    {analyst.riskFactors.length}{" "}
                    flag
                    {analyst.riskFactors.length === 1
                      ? ""
                      : "s"}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl bg-slate-950 p-4">
                  <div className="text-xs text-slate-600">
                    Market State
                  </div>

                  <div className="mt-2 text-sm text-slate-300">
                    {analyst.marketState}
                  </div>
                </div>

                <div className="rounded-xl bg-slate-950 p-4">
                  <div className="text-xs text-slate-600">
                    ML State
                  </div>

                  <div className="mt-2 text-sm text-slate-300">
                    {analyst.mlState}
                  </div>
                </div>

                <div className="rounded-xl bg-slate-950 p-4">
                  <div className="text-xs text-slate-600">
                    Uncertainty
                  </div>

                  <div className="mt-2 text-sm text-slate-300">
                    {analyst.uncertainty}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl bg-slate-950 p-4">
                  <div className="text-xs text-slate-600">
                    Confluence Factors
                  </div>

                  <div className="mt-3 space-y-2">
                    {analyst.confluence.length === 0 ? (
                      <div className="text-xs text-slate-600">
                        No confluence factors.
                      </div>
                    ) : (
                      analyst.confluence.map(
                        (factor, index) => (
                          <div
                            key={index}
                            className="text-xs leading-5 text-slate-400"
                          >
                            - {factor}
                          </div>
                        ),
                      )
                    )}
                  </div>
                </div>

                <div className="rounded-xl bg-slate-950 p-4">
                  <div className="text-xs text-slate-600">
                    Risk Factors
                  </div>

                  <div className="mt-3 space-y-2">
                    {analyst.riskFactors.length === 0 ? (
                      <div className="text-xs text-slate-600">
                        No risk factors.
                      </div>
                    ) : (
                      analyst.riskFactors.map(
                        (risk, index) => (
                          <div
                            key={index}
                            className="text-xs leading-5 text-slate-400"
                          >
                            - {risk}
                          </div>
                        ),
                      )
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4">
                <div className="text-xs text-slate-600">
                  Analyst Summary
                </div>

                <div className="mt-2 text-sm leading-6 text-slate-300">
                  {analyst.summary}
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  )
}



