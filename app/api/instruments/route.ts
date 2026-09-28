import { supabaseServer } from "@/lib/supabase/server"

const SUPPORTED_ASSET_TYPES = [
  "stock",
  "crypto",
  "forex",
  "etf",
  "index",
  "commodity",
] as const

type AssetType =
  (typeof SUPPORTED_ASSET_TYPES)[number]

function isValidAssetType(
  value: string | null
): value is AssetType {
  return (
    value !== null &&
    SUPPORTED_ASSET_TYPES.includes(
      value as AssetType
    )
  )
}

export async function GET(
  request: Request
) {
  try {
    const url = new URL(request.url)

    const search =
      url.searchParams
        .get("search")
        ?.trim() ?? ""

    const assetType =
      url.searchParams
        .get("assetType")
        ?.trim()
        .toLowerCase() ?? null

    const limitParam =
      url.searchParams.get("limit") ?? "50"

    const limit = Number(limitParam)

    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      return Response.json(
        {
          success: false,
          error:
            "limit must be an integer between 1 and 100",
        },
        { status: 400 }
      )
    }

    if (
      assetType !== null &&
      !isValidAssetType(assetType)
    ) {
      return Response.json(
        {
          success: false,
          error: "Invalid assetType",
          supportedAssetTypes:
            SUPPORTED_ASSET_TYPES,
        },
        { status: 400 }
      )
    }

    let query =
      supabaseServer
        .from("instruments")
        .select(
          "id,symbol,name,asset_type,exchange,region,currency,base_symbol,quote_symbol,provider,provider_symbol,active"
        )
        .eq("active", true)

    if (assetType !== null) {
      query = query.eq(
        "asset_type",
        assetType
      )
    }

    if (search) {
      const pattern = `%${search}%`

      query = query.or(
        `symbol.ilike.${pattern},name.ilike.${pattern},exchange.ilike.${pattern}`
      )
    }

    const {
      data,
      error,
    } = await query
      .order("asset_type", {
        ascending: true,
      })
      .order("symbol", {
        ascending: true,
      })
      .limit(limit)

    if (error) {
      return Response.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      )
    }

    const instruments =
      (data ?? []).map(
        (row) => ({
          id: row.id,
          symbol: row.symbol,
          name: row.name,
          assetType:
            row.asset_type,
          exchange:
            row.exchange,
          region:
            row.region,
          currency:
            row.currency,
          baseSymbol:
            row.base_symbol,
          quoteSymbol:
            row.quote_symbol,
          provider:
            row.provider,
          providerSymbol:
            row.provider_symbol,
          active:
            row.active,
        })
      )

    return Response.json({
      success: true,

      query: {
        search:
          search || null,
        assetType,
        limit,
      },

      count:
        instruments.length,

      instruments,
    })
  } catch (error) {
    console.error(
      "Instrument API error:",
      error
    )

    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown server error",
      },
      { status: 500 }
    )
  }
}