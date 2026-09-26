"use client"

import { useCallback, useEffect, useState } from "react"
import CandlestickChart from "@/components/market/CandlestickChart"
import MarketIndicators from "@/components/market/MarketIndicators"

interface Candle {
  assetType: "stock" | "crypto"
  symbol: string
  timeframe: "1d" | "4h"
  timestamp: string
  open: number
  high: number
  low: number
  close: number
  volume: number | null
}

interface HistoricalResponse {
  success: boolean
  assetType: string
  symbol: string
  timeframe: string
  count: number
  candles: Candle[]
  error?: string
}

interface Feature {
  timestamp: string
  close: number
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

interface FeatureResponse {
  success: boolean
  features: Feature[]
  error?: string
}

interface Prediction {
  prediction: "UP" | "DOWN" | "NEUTRAL"
  probabilities: {
    DOWN: number
    NEUTRAL: number
    UP: number
  }
  probability: number
  model: string
  calibration: string
}

interface AnalystAnalysis {
  marketSummary: string
  technicalSummary: string
  modelSummary: string
  uncertainty: string
  keyFactors: string[]
  riskFactors: string[]
  analystConclusion: string
}

interface AnalystResponse {
  success: boolean
  version: string
  source: string
  liveAI: boolean
  providerStatus: string
  contextVersion: string
  symbol: string
  assetType: string
  timeframe: string
  horizon: number
  market: {
    close: number
    returnPercent: number
    timestamp: string
  }
  prediction: Prediction
  analysis: AnalystAnalysis
  error?: string
}

const LIMIT_OPTIONS = [50, 100, 180]

export default function MarketChartPage() {
  const [candles, setCandles] =
    useState<Candle[]>([])

  const [features, setFeatures] =
    useState<Feature[]>([])

  const [limit, setLimit] =
    useState(180)

  const [loading, setLoading] =
    useState(true)

  const [featuresLoading, setFeaturesLoading] =
    useState(true)

  const [error, setError] =
    useState<string | null>(null)

  const [featuresError, setFeaturesError] =
    useState<string | null>(null)

  const [analystLoading, setAnalystLoading] =
    useState(false)

  const [analystError, setAnalystError] =
    useState<string | null>(null)

  const [analyst, setAnalyst] =
    useState<AnalystResponse | null>(null)

  const loadHistoricalData =
    useCallback(async () => {
      try {
        setLoading(true)
        setError(null)

        const response =
          await fetch(
            `/api/market/historical/data?symbol=BTC&assetType=crypto&timeframe=4h&limit=${limit}`,
            {
              cache: "no-store",
            }
          )

        const result =
          (await response.json()) as HistoricalResponse

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.error ??
              "Failed to load historical data"
          )
        }

        setCandles(result.candles)
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Unknown error"
        )
      } finally {
        setLoading(false)
      }
    }, [limit])

  const loadFeatures =
    useCallback(async () => {
      try {
        setFeaturesLoading(true)
        setFeaturesError(null)

        const response =
          await fetch(
            "/api/market/features?symbol=BTC&assetType=crypto&timeframe=4h",
            {
              cache: "no-store",
            }
          )

        const result =
          (await response.json()) as FeatureResponse

        if (
          !response.ok ||
          !result.success
        ) {
          throw new Error(
            result.error ??
              "Failed to load market features"
          )
        }

        setFeatures(result.features)
      } catch (error) {
        setFeaturesError(
          error instanceof Error
            ? error.message
            : "Unknown feature error"
        )
      } finally {
        setFeaturesLoading(false)
      }
    }, [])

  useEffect(() => {
    loadHistoricalData()
  }, [loadHistoricalData])

  useEffect(() => {
    loadFeatures()
  }, [loadFeatures])

  const runAnalyst = async () => {
    try {
      setAnalystLoading(true)
      setAnalystError(null)

      const response =
        await fetch(
          "/api/market/intelligence/demo?symbol=BTC&assetType=crypto&timeframe=4h&horizon=6",
          {
            cache: "no-store",
          }
        )

      const result =
        (await response.json()) as AnalystResponse

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.error ??
            "Failed to run Market Analyst"
        )
      }

      setAnalyst(result)
    } catch (error) {
      setAnalystError(
        error instanceof Error
          ? error.message
          : "Unknown analyst error"
      )
    } finally {
      setAnalystLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            MarketX Historical Chart
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            BTC / USD - 4H
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-lg font-semibold text-gray-900">
                BTC / USD
              </div>

              <div className="text-sm text-gray-500">
                {candles.length} candles - 4H
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="mr-2 text-sm text-gray-500">
                Candles
              </div>

              {LIMIT_OPTIONS.map(
                (option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() =>
                      setLimit(option)
                    }
                    disabled={loading}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                      limit === option
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    {option}
                  </button>
                )
              )}

              <button
                type="button"
                onClick={
                  loadHistoricalData
                }
                disabled={loading}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Loading..."
                  : "Reload"}
              </button>
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Data source: Supabase historical
              database
            </div>

            <div className="text-sm text-gray-500">
              Green = Bullish - Red = Bearish
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex h-[500px] items-center justify-center text-gray-500">
              Loading historical candles...
            </div>
          ) : candles.length > 0 ? (
            <CandlestickChart
              candles={candles}
            />
          ) : (
            <div className="flex h-[500px] items-center justify-center text-gray-500">
              No historical candles found.
            </div>
          )}

          {featuresError && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {featuresError}
            </div>
          )}

          {featuresLoading ? (
            <div className="mt-6 flex h-40 items-center justify-center rounded-2xl border border-gray-200 bg-white text-sm text-gray-500">
              Loading technical indicators...
            </div>
          ) : features.length > 0 ? (
            <MarketIndicators
              features={features}
            />
          ) : null}

          <div className="mt-8 border-t border-gray-200 pt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  Market Intelligence
                </div>

                <div className="text-sm text-gray-500">
                  V5.2 Demo Analyst - menggunakan
                  V5.1 Intelligence Context dan ML
                  Prediction
                </div>
              </div>

              <button
                type="button"
                onClick={runAnalyst}
                disabled={analystLoading}
                className="rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {analystLoading
                  ? "Analyzing..."
                  : "AI MARKET ANALYST"}
              </button>
            </div>

            {analystError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {analystError}
              </div>
            )}

            {analyst && (
              <div className="mt-6 space-y-5">
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold text-amber-900">
                      DEMO ANALYST MODE
                    </div>

                    <div className="text-xs font-medium text-amber-700">
                      OpenAI Live: OFF
                    </div>
                  </div>

                  <p className="mt-1 text-sm text-amber-800">
                    Analisis ini menggunakan data
                    MarketX V5.1 dan output ML yang
                    sudah tersedia. OpenAI live akan
                    diaktifkan setelah API credit
                    tersedia.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                    <div className="mb-2 text-sm font-semibold text-gray-500">
                      MARKET SUMMARY
                    </div>

                    <p className="text-sm leading-6 text-gray-800">
                      {analyst.analysis.marketSummary}
                    </p>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                    <div className="mb-2 text-sm font-semibold text-gray-500">
                      TECHNICAL SUMMARY
                    </div>

                    <p className="text-sm leading-6 text-gray-800">
                      {analyst.analysis.technicalSummary}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-5">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-500">
                        ML PREDICTION
                      </div>

                      <div className="mt-1 text-2xl font-bold text-gray-900">
                        {analyst.prediction.prediction}
                      </div>
                    </div>

                    <div className="text-right text-xs text-gray-500">
                      <div>
                        Model:{" "}
                        {analyst.prediction.model}
                      </div>

                      <div>
                        Calibration:{" "}
                        {analyst.prediction.calibration}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {(
                      [
                        ["DOWN", analyst.prediction.probabilities.DOWN],
                        ["NEUTRAL", analyst.prediction.probabilities.NEUTRAL],
                        ["UP", analyst.prediction.probabilities.UP],
                      ] as const
                    ).map(
                      ([label, value]) => (
                        <div
                          key={label}
                          className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                        >
                          <div className="text-xs font-semibold text-gray-500">
                            {label}
                          </div>

                          <div className="mt-1 text-xl font-bold text-gray-900">
                            {(value * 100).toFixed(2)}%
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-gray-200 bg-white p-5">
                    <div className="mb-3 text-sm font-semibold text-gray-500">
                      KEY FACTORS
                    </div>

                    <ul className="space-y-2 text-sm text-gray-800">
                      {analyst.analysis.keyFactors.map(
                        (factor, index) => (
                          <li
                            key={index}
                            className="flex gap-2"
                          >
                            <span>•</span>
                            <span>{factor}</span>
                          </li>
                        )
                      )}
                    </ul>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white p-5">
                    <div className="mb-3 text-sm font-semibold text-gray-500">
                      RISK FACTORS
                    </div>

                    <ul className="space-y-2 text-sm text-gray-800">
                      {analyst.analysis.riskFactors.map(
                        (factor, index) => (
                          <li
                            key={index}
                            className="flex gap-2"
                          >
                            <span>•</span>
                            <span>{factor}</span>
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                  <div className="mb-2 text-sm font-semibold text-gray-500">
                    UNCERTAINTY
                  </div>

                  <p className="text-sm leading-6 text-gray-800">
                    {analyst.analysis.uncertainty}
                  </p>
                </div>

                <div className="rounded-xl border border-gray-900 bg-gray-900 p-5 text-white">
                  <div className="mb-2 text-sm font-semibold text-gray-300">
                    ANALYST CONCLUSION
                  </div>

                  <p className="text-sm leading-6 text-gray-100">
                    {analyst.analysis.analystConclusion}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
