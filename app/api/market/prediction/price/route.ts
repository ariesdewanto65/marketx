import { NextRequest, NextResponse } from "next/server"

const ML_SERVICE_URL = process.env.MARKETX_ML_SERVICE_URL

const ALLOWED_ASSET_TYPES = new Set(["stock", "crypto"])
const ALLOWED_TIMEFRAMES = new Set(["1d", "4h"])

export async function GET(request: NextRequest) {
  try {
    if (!ML_SERVICE_URL) {
      return NextResponse.json(
        {
          success: false,
          error: "MARKETX_ML_SERVICE_URL is not configured",
        },
        { status: 500 }
      )
    }

    const searchParams = request.nextUrl.searchParams

    const symbol = searchParams.get("symbol")?.trim().toUpperCase()
    const assetType = searchParams.get("assetType") ?? "crypto"
    const timeframe = searchParams.get("timeframe") ?? "4h"
    const horizon = Number(searchParams.get("horizon") ?? "6")

    if (!symbol) {
      return NextResponse.json(
        {
          success: false,
          error: "symbol is required",
        },
        { status: 400 }
      )
    }

    if (!ALLOWED_ASSET_TYPES.has(assetType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported assetType: ${assetType}`,
        },
        { status: 400 }
      )
    }

    if (!ALLOWED_TIMEFRAMES.has(timeframe)) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported timeframe: ${timeframe}`,
        },
        { status: 400 }
      )
    }

    if (
      !Number.isInteger(horizon) ||
      horizon < 1 ||
      horizon > 30
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "horizon must be an integer between 1 and 30",
        },
        { status: 400 }
      )
    }

    const url = new URL(
      "/price-prediction",
      ML_SERVICE_URL
    )

    url.searchParams.set("symbol", symbol)
    url.searchParams.set("assetType", assetType)
    url.searchParams.set("timeframe", timeframe)
    url.searchParams.set("horizon", String(horizon))

    const response = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
    })

    const payload = await response.json()

    if (!response.ok || !payload.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            payload?.error ??
            "ML price prediction service failed",
        },
        { status: response.status || 502 }
      )
    }

    return NextResponse.json({
      success: true,
      source: "python-ml-service",
      prediction: payload,
    })
  } catch (error) {
    console.error("Price prediction API error:", error)

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown price prediction error",
      },
      { status: 500 }
    )
  }
}