"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  CandlestickSeries,
  ColorType,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts"

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

interface Feature {
  assetType: "stock" | "crypto"
  symbol: string
  timeframe: "1d" | "4h"
  timestamp: string

  open: number
  high: number
  low: number
  close: number
  volume: number | null

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

interface PredictionLabel {
  timestamp: string
  futureTimestamp: string
  futureReturnPercent: number
  direction: "UP" | "DOWN" | "NEUTRAL"
  horizonCandles: number
  thresholdPercent: number
}

interface LabelResponse {
  success: boolean
  labels: PredictionLabel[]
  error?: string
}

function formatNumber(
  value: number | null | undefined,
  digits = 2
) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return "-"
  }

  return value.toFixed(digits)
}

function formatDate(timestamp: string) {
  const date = new Date(timestamp)

  if (Number.isNaN(date.getTime())) {
    return timestamp
  }

  return date.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function directionClass(
  direction: PredictionLabel["direction"]
) {
  if (direction === "UP") {
    return "text-green-700"
  }

  if (direction === "DOWN") {
    return "text-red-700"
  }

  return "text-gray-700"
}

function Metric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </div>

      <div className="mt-1 text-lg font-bold text-gray-900">
        {value}
      </div>
    </div>
  )
}

export default function CandlestickChart({
  candles,
}: {
  candles: Candle[]
}) {
  const chartContainerRef =
    useRef<HTMLDivElement | null>(null)

  const chartRef =
    useRef<IChartApi | null>(null)

  const seriesRef =
    useRef<ISeriesApi<"Candlestick"> | null>(null)

  const [features, setFeatures] =
    useState<Feature[]>([])

  const [labels, setLabels] =
    useState<PredictionLabel[]>([])

  const [selectedTimestamp, setSelectedTimestamp] =
    useState<string | null>(null)

  const [loadingIntelligence, setLoadingIntelligence] =
    useState(false)

  const [intelligenceError, setIntelligenceError] =
    useState<string | null>(null)

  const selectedCandle = useMemo(() => {
    if (!selectedTimestamp) {
      return null
    }

    return (
      candles.find(
        (candle) =>
          candle.timestamp ===
          selectedTimestamp
      ) ?? null
    )
  }, [candles, selectedTimestamp])

  const selectedFeature = useMemo(() => {
    if (!selectedTimestamp) {
      return null
    }

    return (
      features.find(
        (feature) =>
          feature.timestamp ===
          selectedTimestamp
      ) ?? null
    )
  }, [features, selectedTimestamp])

  const selectedLabel = useMemo(() => {
    if (!selectedTimestamp) {
      return null
    }

    return (
      labels.find(
        (label) =>
          label.timestamp ===
          selectedTimestamp
      ) ?? null
    )
  }, [labels, selectedTimestamp])

  useEffect(() => {
    if (!chartContainerRef.current) {
      return
    }

    const container =
      chartContainerRef.current

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 500,

      layout: {
        background: {
          type: ColorType.Solid,
          color: "#ffffff",
        },
        textColor: "#374151",
      },

      grid: {
        vertLines: {
          color: "#e5e7eb",
        },
        horzLines: {
          color: "#e5e7eb",
        },
      },

      rightPriceScale: {
        borderColor: "#d1d5db",
      },

      timeScale: {
        borderColor: "#d1d5db",
        timeVisible: true,
        secondsVisible: false,
      },

      crosshair: {
        mode: 1,
      },
    })

    const series =
      chart.addSeries(
        CandlestickSeries,
        {
          upColor: "#16a34a",
          downColor: "#dc2626",
          borderUpColor: "#16a34a",
          borderDownColor: "#dc2626",
          wickUpColor: "#16a34a",
          wickDownColor: "#dc2626",
        }
      )

    chartRef.current = chart
    seriesRef.current = series

    const resizeObserver =
      new ResizeObserver(() => {
        chart.applyOptions({
          width: container.clientWidth,
        })
      })

    resizeObserver.observe(container)

    const handleClick = (param: {
      time?: unknown
    }) => {
      if (param.time === undefined) {
        return
      }

      const numericTime =
        typeof param.time === "number"
          ? param.time
          : null

      if (numericTime === null) {
        return
      }

      const clickedCandle =
        candles.find(
          (candle) =>
            Math.floor(
              new Date(
                candle.timestamp
              ).getTime() / 1000
            ) === numericTime
        )

      if (!clickedCandle) {
        return
      }

      setSelectedTimestamp(
        clickedCandle.timestamp
      )
    }

    chart.subscribeClick(handleClick)

    return () => {
      chart.unsubscribeClick(handleClick)
      resizeObserver.disconnect()
      chart.remove()

      chartRef.current = null
      seriesRef.current = null
    }
  }, [candles])

  useEffect(() => {
    const series = seriesRef.current

    if (!series) {
      return
    }

    const data = candles.map(
      (candle) => ({
        time: Math.floor(
          new Date(
            candle.timestamp
          ).getTime() / 1000
        ) as UTCTimestamp,

        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      })
    )

    series.setData(data)

    if (data.length > 60) {
      chartRef.current?.timeScale().setVisibleLogicalRange({
        from: data.length - 60,
        to: data.length + 2,
      })
    } else {
      chartRef.current?.timeScale().fitContent()
    }
  }, [candles])

  useEffect(() => {
    if (candles.length === 0) {
      return
    }

    const first = candles[0]

    async function loadIntelligence() {
      try {
        setLoadingIntelligence(true)
        setIntelligenceError(null)

        const featureResponse =
          await fetch(
            `/api/market/features?symbol=${first.symbol}&assetType=${first.assetType}&timeframe=${first.timeframe}`,
            {
              cache: "no-store",
            }
          )

        const featureResult =
          (await featureResponse.json()) as FeatureResponse

        if (
          !featureResponse.ok ||
          !featureResult.success
        ) {
          throw new Error(
            featureResult.error ??
              "Failed to load market features"
          )
        }

        const labelResponse =
          await fetch(
            `/api/market/prediction/labels?symbol=${first.symbol}&assetType=${first.assetType}&timeframe=${first.timeframe}&horizon=6&threshold=0.5`,
            {
              cache: "no-store",
            }
          )

        const labelResult =
          (await labelResponse.json()) as LabelResponse

        if (
          !labelResponse.ok ||
          !labelResult.success
        ) {
          throw new Error(
            labelResult.error ??
              "Failed to load prediction labels"
          )
        }

        setFeatures(
          featureResult.features
        )

        setLabels(
          labelResult.labels
        )
      } catch (error) {
        setIntelligenceError(
          error instanceof Error
            ? error.message
            : "Failed to load candle intelligence"
        )
      } finally {
        setLoadingIntelligence(false)
      }
    }

    loadIntelligence()
  }, [candles])

  useEffect(() => {
    if (
      selectedTimestamp ||
      candles.length === 0
    ) {
      return
    }

    setSelectedTimestamp(
      candles[candles.length - 1].timestamp
    )
  }, [candles, selectedTimestamp])

  return (
    <div>
      <div
        ref={chartContainerRef}
        className="w-full"
      />

      <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Candle Explorer
            </h3>

            <p className="text-sm text-gray-500">
              Klik candle untuk membedah kondisi
              market pada waktu tersebut.
            </p>
          </div>

          {selectedCandle && (
            <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-right">
              <div className="text-xs text-gray-500">
                Selected candle
              </div>

              <div className="text-sm font-semibold text-gray-900">
                {formatDate(
                  selectedCandle.timestamp
                )}
              </div>
            </div>
          )}
        </div>

        {loadingIntelligence && (
          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500">
            Loading candle intelligence...
          </div>
        )}

        {intelligenceError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {intelligenceError}
          </div>
        )}

        {selectedCandle &&
          selectedFeature &&
          !loadingIntelligence && (
            <div className="mt-5 space-y-5">
              <div>
                <div className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">
                  Selected Candle
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Metric
                    label="Open"
                    value={formatNumber(
                      selectedCandle.open
                    )}
                  />

                  <Metric
                    label="High"
                    value={formatNumber(
                      selectedCandle.high
                    )}
                  />

                  <Metric
                    label="Low"
                    value={formatNumber(
                      selectedCandle.low
                    )}
                  />

                  <Metric
                    label="Close"
                    value={formatNumber(
                      selectedCandle.close
                    )}
                  />
                </div>
              </div>

              <div>
                <div className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">
                  Technical State
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Metric
                    label="RSI 14"
                    value={formatNumber(
                      selectedFeature.rsi14
                    )}
                  />

                  <Metric
                    label="MACD"
                    value={formatNumber(
                      selectedFeature.macd
                    )}
                  />

                  <Metric
                    label="MACD Signal"
                    value={formatNumber(
                      selectedFeature.macdSignal
                    )}
                  />

                  <Metric
                    label="MACD Histogram"
                    value={formatNumber(
                      selectedFeature.macdHistogram
                    )}
                  />

                  <Metric
                    label="ATR 14"
                    value={formatNumber(
                      selectedFeature.atr14
                    )}
                  />

                  <Metric
                    label="Momentum 14"
                    value={formatNumber(
                      selectedFeature.momentum14
                    )}
                  />

                  <Metric
                    label="Volatility 20"
                    value={formatNumber(
                      selectedFeature.volatility20,
                      4
                    )}
                  />

                  <Metric
                    label="Return"
                    value={
                      selectedFeature.returnPercent ===
                      null
                        ? "-"
                        : `${selectedFeature.returnPercent.toFixed(
                            2
                          )}%`
                    }
                  />
                </div>
              </div>

              <div>
                <div className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">
                  Bollinger State
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Metric
                    label="Upper"
                    value={formatNumber(
                      selectedFeature.bollingerUpper20
                    )}
                  />

                  <Metric
                    label="Middle"
                    value={formatNumber(
                      selectedFeature.bollingerMiddle20
                    )}
                  />

                  <Metric
                    label="Lower"
                    value={formatNumber(
                      selectedFeature.bollingerLower20
                    )}
                  />

                  <Metric
                    label="Width"
                    value={
                      selectedFeature.bollingerWidth20 ===
                      null
                        ? "-"
                        : `${selectedFeature.bollingerWidth20.toFixed(
                            2
                          )}%`
                    }
                  />
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="text-sm font-bold uppercase tracking-wide text-gray-500">
                  Historical Outcome
                </div>

                <div className="mt-1 text-xs text-gray-500">
                  Actual outcome after the selected
                  candle. This is not an ML prediction.
                </div>

                {selectedLabel ? (
                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    <div>
                      <div className="text-xs text-gray-500">
                        Horizon
                      </div>

                      <div className="text-lg font-bold text-gray-900">
                        {selectedLabel.horizonCandles} candles
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500">
                        Future Return
                      </div>

                      <div className="text-lg font-bold text-gray-900">
                        {selectedLabel.futureReturnPercent.toFixed(
                          2
                        )}
                        %
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500">
                        Direction
                      </div>

                      <div
                        className={`text-lg font-bold ${directionClass(
                          selectedLabel.direction
                        )}`}
                      >
                        {selectedLabel.direction}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 text-sm text-gray-500">
                    Tidak tersedia karena candle berada
                    di bagian akhir dataset dan belum
                    memiliki future candle.
                  </div>
                )}
              </div>
            </div>
          )}
      </div>
    </div>
  )
}
