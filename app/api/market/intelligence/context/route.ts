import { supabaseServer } from "@/lib/supabase/server"

import { buildMarketFeatures } from "@/lib/market/feature-engine"
import { validateMarketFeatures } from "@/lib/market/feature-validator"

import type { MarketCandle } from "@/types/candle"


const ML_SERVICE_URL =
  process.env.MARKETX_ML_SERVICE_URL ??
  "http://127.0.0.1:8000"


const FEATURE_COLUMNS = [
  "returnPercent",
  "sma20",
  "ema20",
  "momentum14",
  "volatility20",
  "rsi14",
  "macd",
  "macdSignal",
  "macdHistogram",
  "atr14",
  "bollingerMiddle20",
  "bollingerUpper20",
  "bollingerLower20",
  "bollingerWidth20",
] as const


function isValidAssetType(
  value: string | null
): value is "stock" | "crypto" {
  return (
    value === "stock" ||
    value === "crypto"
  )
}


function isValidTimeframe(
  value: string | null
): value is "1d" | "4h" {
  return (
    value === "1d" ||
    value === "4h"
  )
}


export async function GET(
  request: Request
) {
  try {
    const url = new URL(request.url)

    const symbol =
      url.searchParams
        .get("symbol")
        ?.toUpperCase()

    const assetType =
      url.searchParams.get(
        "assetType"
      )

    const timeframe =
      url.searchParams.get(
        "timeframe"
      )

    const horizon =
      Number(
        url.searchParams.get(
          "horizon"
        ) ?? "6"
      )

    if (!symbol) {
      return Response.json(
        {
          success: false,
          error:
            "symbol is required",
        },
        {
          status: 400,
        }
      )
    }

    if (!isValidAssetType(assetType)) {
      return Response.json(
        {
          success: false,
          error:
            "assetType must be stock or crypto",
        },
        {
          status: 400,
        }
      )
    }

    if (!isValidTimeframe(timeframe)) {
      return Response.json(
        {
          success: false,
          error:
            "timeframe must be 1d or 4h",
        },
        {
          status: 400,
        }
      )
    }

    if (
      assetType === "stock" &&
      timeframe !== "1d"
    ) {
      return Response.json(
        {
          success: false,
          error:
            "stocks currently support only 1d",
        },
        {
          status: 400,
        }
      )
    }

    if (
      assetType === "crypto" &&
      timeframe !== "4h"
    ) {
      return Response.json(
        {
          success: false,
          error:
            "crypto currently supports only 4h",
        },
        {
          status: 400,
        }
      )
    }

    if (
      !Number.isInteger(horizon) ||
      horizon <= 0
    ) {
      return Response.json(
        {
          success: false,
          error:
            "horizon must be a positive integer",
        },
        {
          status: 400,
        }
      )
    }


    const {
      data,
      error,
    } =
      await supabaseServer
        .from("market_candles")
        .select(
          "asset_type,symbol,timeframe,timestamp,open,high,low,close,volume"
        )
        .eq(
          "asset_type",
          assetType
        )
        .eq(
          "symbol",
          symbol
        )
        .eq(
          "timeframe",
          timeframe
        )
        .order(
          "timestamp",
          {
            ascending: true,
          }
        )
        .limit(1000)


    if (error) {
      return Response.json(
        {
          success: false,
          error:
            error.message,
        },
        {
          status: 500,
        }
      )
    }


    if (
      !data ||
      data.length === 0
    ) {
      return Response.json(
        {
          success: false,
          error:
            "No historical candles found",
        },
        {
          status: 404,
        }
      )
    }


    const candles: MarketCandle[] =
      data.map(
        (row) => ({
          assetType:
            row.asset_type as
              | "stock"
              | "crypto",

          symbol:
            row.symbol,

          timeframe:
            row.timeframe as
              | "1d"
              | "4h",

          timestamp:
            row.timestamp,

          open:
            Number(row.open),

          high:
            Number(row.high),

          low:
            Number(row.low),

          close:
            Number(row.close),

          volume:
            row.volume === null
              ? null
              : Number(row.volume),
        })
      )


    const features =
      buildMarketFeatures(
        candles
      )


    const validation =
      validateMarketFeatures(
        features
      )


    if (!validation.valid) {
      return Response.json(
        {
          success: false,
          error:
            "Feature validation failed",
          validation,
        },
        {
          status: 500,
        }
      )
    }


    const latestCandle =
      candles[
        candles.length - 1
      ]

    const latestFeature =
      features[
        features.length - 1
      ]


    if (
      !latestCandle ||
      !latestFeature
    ) {
      return Response.json(
        {
          success: false,
          error:
            "Latest market data unavailable",
        },
        {
          status: 500,
        }
      )
    }


    const mlFeatures:
      Record<
        string,
        number | null
      > = {}


    for (
      const column
        of FEATURE_COLUMNS
    ) {
      mlFeatures[column] =
        latestFeature[column]
    }


    const mlResponse =
      await fetch(
        `${ML_SERVICE_URL}/predict`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              assetType,
              symbol,
              timeframe,

              timestamp:
                latestFeature.timestamp,

              horizonCandles:
                horizon,

              features:
                mlFeatures,
            }),

          cache:
            "no-store",
        }
      )


    const mlData =
      await mlResponse.json()


    if (!mlResponse.ok) {
      return Response.json(
        {
          success: false,
          error:
            "ML prediction service failed",
          mlStatus:
            mlResponse.status,
          mlResponse:
            mlData,
        },
        {
          status: 502,
        }
      )
    }


    if (
      !mlData.success
    ) {
      return Response.json(
        {
          success: false,
          error:
            "ML prediction returned unsuccessful response",
          mlResponse:
            mlData,
        },
        {
          status: 502,
        }
      )
    }


    const intelligenceContext =
      {
        market: {
          assetType,
          symbol,
          timeframe,

          latestTimestamp:
            latestCandle.timestamp,

          open:
            latestCandle.open,

          high:
            latestCandle.high,

          low:
            latestCandle.low,

          close:
            latestCandle.close,

          volume:
            latestCandle.volume,
        },

        technical: {
          returnPercent:
            latestFeature.returnPercent,

          sma20:
            latestFeature.sma20,

          ema20:
            latestFeature.ema20,

          momentum14:
            latestFeature.momentum14,

          volatility20:
            latestFeature.volatility20,

          rsi14:
            latestFeature.rsi14,

          macd:
            latestFeature.macd,

          macdSignal:
            latestFeature.macdSignal,

          macdHistogram:
            latestFeature.macdHistogram,

          atr14:
            latestFeature.atr14,

          bollingerMiddle20:
            latestFeature.bollingerMiddle20,

          bollingerUpper20:
            latestFeature.bollingerUpper20,

          bollingerLower20:
            latestFeature.bollingerLower20,

          bollingerWidth20:
            latestFeature.bollingerWidth20,
        },

        prediction: {
          horizonCandles:
            mlData.horizonCandles,

          prediction:
            mlData.prediction,

          probabilities:
            mlData.probabilities,

          probability:
            mlData.probability,

          model:
            mlData.model,

          calibration:
            mlData.calibration,

          timestamp:
            mlData.timestamp,
        },

        validation: {
          featureValidation:
            validation,
        },
      }


    return Response.json({
      success: true,

      contextVersion:
        "v5.1",

      source:
        "marketx-intelligence-context",

      generatedAt:
        new Date().toISOString(),

      context:
        intelligenceContext,
    })


  } catch (error) {
    console.error(
      "Market intelligence context error:",
      error
    )

    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      {
        status: 500,
      }
    )
  }
}
