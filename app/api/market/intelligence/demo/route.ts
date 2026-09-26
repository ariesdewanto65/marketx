import { NextRequest, NextResponse } from "next/server"
import { analyzeMarket } from "@/lib/market/analyst-engine"
import type { MarketFeature } from "@/types/feature"
import type {
  CandleAssetType,
  MarketTimeframe,
} from "@/types/candle"
import type { PredictionDirection } from "@/types/prediction"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams

    const symbol = searchParams.get("symbol") ?? "BTC"

    const rawAssetType =
      searchParams.get("assetType") ?? "crypto"

    const rawTimeframe =
      searchParams.get("timeframe") ?? "4h"

    if (
      rawAssetType !== "stock" &&
      rawAssetType !== "crypto"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid assetType. Use stock or crypto.",
        },
        { status: 400 }
      )
    }

    if (
      rawTimeframe !== "1d" &&
      rawTimeframe !== "4h"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid timeframe. Use 1d or 4h.",
        },
        { status: 400 }
      )
    }

    const assetType: CandleAssetType = rawAssetType
    const timeframe: MarketTimeframe = rawTimeframe

    if (
      (assetType === "stock" && timeframe !== "1d") ||
      (assetType === "crypto" && timeframe !== "4h")
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid assetType/timeframe combination.",
        },
        { status: 400 }
      )
    }

    const contextUrl =
      `${request.nextUrl.origin}/api/market/intelligence/context` +
      `?symbol=${encodeURIComponent(symbol)}` +
      `&assetType=${encodeURIComponent(assetType)}` +
      `&timeframe=${encodeURIComponent(timeframe)}`

    const contextResponse = await fetch(contextUrl, {
      cache: "no-store",
    })

    if (!contextResponse.ok) {
      const errorText = await contextResponse.text()

      return NextResponse.json(
        {
          success: false,
          error:
            "Failed to load market intelligence context.",
          details: errorText,
        },
        { status: 502 }
      )
    }

    const contextData = await contextResponse.json()

    if (!contextData.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Market intelligence context returned an unsuccessful response.",
        },
        { status: 502 }
      )
    }

    const market = contextData.context.market
    const technical = contextData.context.technical
    const prediction = contextData.context.prediction

    const feature: MarketFeature = {
      assetType,
      symbol,
      timeframe,
      timestamp: market.latestTimestamp,

      open: Number(market.open),
      high: Number(market.high),
      low: Number(market.low),
      close: Number(market.close),

      volume:
        market.volume === null ||
        market.volume === undefined
          ? null
          : Number(market.volume),

      returnPercent:
        technical.returnPercent === null ||
        technical.returnPercent === undefined
          ? null
          : Number(technical.returnPercent),

      sma20:
        technical.sma20 === null ||
        technical.sma20 === undefined
          ? null
          : Number(technical.sma20),

      ema20:
        technical.ema20 === null ||
        technical.ema20 === undefined
          ? null
          : Number(technical.ema20),

      momentum14:
        technical.momentum14 === null ||
        technical.momentum14 === undefined
          ? null
          : Number(technical.momentum14),

      volatility20:
        technical.volatility20 === null ||
        technical.volatility20 === undefined
          ? null
          : Number(technical.volatility20),

      rsi14:
        technical.rsi14 === null ||
        technical.rsi14 === undefined
          ? null
          : Number(technical.rsi14),

      macd:
        technical.macd === null ||
        technical.macd === undefined
          ? null
          : Number(technical.macd),

      macdSignal:
        technical.macdSignal === null ||
        technical.macdSignal === undefined
          ? null
          : Number(technical.macdSignal),

      macdHistogram:
        technical.macdHistogram === null ||
        technical.macdHistogram === undefined
          ? null
          : Number(technical.macdHistogram),

      atr14:
        technical.atr14 === null ||
        technical.atr14 === undefined
          ? null
          : Number(technical.atr14),

      bollingerMiddle20:
        technical.bollingerMiddle20 === null ||
        technical.bollingerMiddle20 === undefined
          ? null
          : Number(technical.bollingerMiddle20),

      bollingerUpper20:
        technical.bollingerUpper20 === null ||
        technical.bollingerUpper20 === undefined
          ? null
          : Number(technical.bollingerUpper20),

      bollingerLower20:
        technical.bollingerLower20 === null ||
        technical.bollingerLower20 === undefined
          ? null
          : Number(technical.bollingerLower20),

      bollingerWidth20:
        technical.bollingerWidth20 === null ||
        technical.bollingerWidth20 === undefined
          ? null
          : Number(technical.bollingerWidth20),
    }

    const direction =
      prediction.prediction as PredictionDirection

    const probabilities = {
      DOWN: Number(prediction.probabilities.DOWN),
      NEUTRAL: Number(
        prediction.probabilities.NEUTRAL
      ),
      UP: Number(prediction.probabilities.UP),
    }

    const analyst = analyzeMarket({
      market: feature,
      prediction: {
        prediction: direction,
        probabilities,
        model: String(prediction.model),
        calibration: String(prediction.calibration),
      },
    })

    const returnPercent = Number(
      feature.returnPercent
    )

    const marketReturnText =
      Number.isFinite(returnPercent)
        ? `${returnPercent.toFixed(2)}%`
        : "data tidak tersedia"

    const marketSummary =
      `${symbol} pada timeframe ${timeframe} terakhir berada pada harga ` +
      `${feature.close}. Perubahan candle terakhir tercatat ` +
      `${marketReturnText}.`

    const technicalSummary =
      `RSI14 ${feature.rsi14?.toFixed(2) ?? "N/A"}, ` +
      `MACD ${feature.macd?.toFixed(2) ?? "N/A"}, ` +
      `MACD Signal ${feature.macdSignal?.toFixed(2) ?? "N/A"}, ` +
      `dan Momentum14 ${feature.momentum14?.toFixed(2) ?? "N/A"}.`

    const predictionSummary =
      `Model ${prediction.model} menghasilkan klasifikasi ` +
      `${direction} dengan probabilitas ` +
      `${(
        probabilities[direction] * 100
      ).toFixed(2)}%.`

    return NextResponse.json({
      success: true,
      mode: "DEMO_ANALYST",
      source: "marketx-deterministic-analyst",
      generatedAt: new Date().toISOString(),

      marketSummary,
      technicalSummary,
      predictionSummary,

      keyFactors: analyst.confluence,
      riskFactors: analyst.riskFactors,

      uncertainty: analyst.uncertainty,

      conclusion: analyst.summary,

      analyst,

      context: {
        market,
        technical,
        prediction,
      },
    })
  } catch (error) {
    console.error("Demo analyst error:", error)

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown analyst error",
      },
      { status: 500 }
    )
  }
}
