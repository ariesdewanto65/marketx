import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase/server"

type AssetType = "stock" | "crypto"

async function getAuthenticatedUser(
  request: Request
) {
  const authorization =
    request.headers.get("authorization")

  if (!authorization?.startsWith("Bearer ")) {
    return null
  }

  const accessToken =
    authorization.slice("Bearer ".length)

  const {
    data: { user },
    error,
  } =
    await supabaseServer.auth.getUser(
      accessToken
    )

  if (error || !user) {
    return null
  }

  return user
}

function normalizeAssetType(
  value: string | null
): AssetType | null {
  if (value === "stock") {
    return "stock"
  }

  if (value === "crypto") {
    return "crypto"
  }

  return null
}

export async function GET(
  request: Request
) {
  try {
    const user =
      await getAuthenticatedUser(request)

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Authentication required",
        },
        {
          status: 401,
        }
      )
    }

    const { data, error } =
      await supabaseServer
        .from("watchlist")
        .select(
          "id, symbol, asset_type, created_at"
        )
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: true,
        })

    if (error) {
      console.error(
        "Watchlist GET error:",
        error.message
      )

      return NextResponse.json(
        {
          error:
            "Failed to load watchlist",
        },
        {
          status: 500,
        }
      )
    }

    return NextResponse.json({
      data: data ?? [],
    })
  } catch (error) {
    console.error(
      "Watchlist GET exception:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Failed to load watchlist",
      },
      {
        status: 500,
      }
    )
  }
}

export async function POST(
  request: Request
) {
  try {
    const user =
      await getAuthenticatedUser(request)

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Authentication required",
        },
        {
          status: 401,
        }
      )
    }

    const body =
      (await request.json()) as {
        symbol?: string
        assetType?: string
      }

    const symbol =
      body.symbol
        ?.trim()
        .toUpperCase()

    const assetType =
      normalizeAssetType(
        body.assetType ?? null
      )

    if (!symbol) {
      return NextResponse.json(
        {
          error:
            "Symbol is required",
        },
        {
          status: 400,
        }
      )
    }

    if (!assetType) {
      return NextResponse.json(
        {
          error:
            "Asset type must be stock or crypto",
        },
        {
          status: 400,
        }
      )
    }

    const { data, error } =
      await supabaseServer
        .from("watchlist")
        .insert({
          user_id: user.id,
          symbol,
          asset_type: assetType,
        })
        .select(
          "id, symbol, asset_type, created_at"
        )
        .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          {
            error:
              "Asset already exists in watchlist",
          },
          {
            status: 409,
          }
        )
      }

      console.error(
        "Watchlist POST error:",
        error.message
      )

      return NextResponse.json(
        {
          error:
            "Failed to add watchlist item",
        },
        {
          status: 500,
        }
      )
    }

    return NextResponse.json(
      {
        data,
      },
      {
        status: 201,
      }
    )
  } catch (error) {
    console.error(
      "Watchlist POST exception:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Failed to add watchlist item",
      },
      {
        status: 500,
      }
    )
  }
}

export async function DELETE(
  request: Request
) {
  try {
    const user =
      await getAuthenticatedUser(request)

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Authentication required",
        },
        {
          status: 401,
        }
      )
    }

    const { searchParams } =
      new URL(request.url)

    const symbol =
      searchParams
        .get("symbol")
        ?.trim()
        .toUpperCase()

    const assetType =
      normalizeAssetType(
        searchParams.get(
          "assetType"
        )
      )

    if (!symbol) {
      return NextResponse.json(
        {
          error:
            "Symbol is required",
        },
        {
          status: 400,
        }
      )
    }

    if (!assetType) {
      return NextResponse.json(
        {
          error:
            "Asset type must be stock or crypto",
        },
        {
          status: 400,
        }
      )
    }

    const { error } =
      await supabaseServer
        .from("watchlist")
        .delete()
        .eq("user_id", user.id)
        .eq("symbol", symbol)
        .eq(
          "asset_type",
          assetType
        )

    if (error) {
      console.error(
        "Watchlist DELETE error:",
        error.message
      )

      return NextResponse.json(
        {
          error:
            "Failed to remove watchlist item",
        },
        {
          status: 500,
        }
      )
    }

    return NextResponse.json({
      success: true,
      symbol,
      assetType,
    })
  } catch (error) {
    console.error(
      "Watchlist DELETE exception:",
      error
    )

    return NextResponse.json(
      {
        error:
          "Failed to remove watchlist item",
      },
      {
        status: 500,
      }
    )
  }
}
