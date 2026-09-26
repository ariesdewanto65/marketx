import { NextResponse } from "next/server"
import {
  AlphaVantageStockProvider,
} from "@/lib/market/stocks"
import {
  CoinGeckoCryptoProvider,
} from "@/lib/market/crypto"
import {
  MarketService,
} from "@/lib/market/service"

export const dynamic = "force-dynamic"

const stockProvider =
  new AlphaVantageStockProvider()

const cryptoProvider =
  new CoinGeckoCryptoProvider()

const marketService =
  new MarketService(
    stockProvider,
    cryptoProvider
  )

export async function GET(
  request: Request
) {
  const { searchParams } =
    new URL(request.url)

  const symbol =
    searchParams
      .get("symbol")
      ?.trim()
      .toUpperCase()

  const assetType =
    searchParams
      .get("assetType")
      ?.trim()
      .toLowerCase()

  const forceRefresh =
    searchParams.get("force") === "true"

  try {
    if (symbol) {
      if (assetType === "crypto") {
        const result =
          await marketService.getCryptoQuote(
            symbol,
            {
              forceRefresh,
            }
          )

        return NextResponse.json(result)
      }

      const result =
        await marketService.getStockQuote(
          symbol,
          {
            forceRefresh,
          }
        )

      return NextResponse.json(result)
    }

    const results =
      await marketService.getMarketSnapshot(
        forceRefresh
      )

    return NextResponse.json({
      data: results,
    })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error"

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 502,
      }
    )
  }
}
