import { NextResponse } from "next/server"

const OPENAI_API_URL =
  "https://api.openai.com/v1/responses"

const OPENAI_MODEL =
  process.env.MARKETX_AI_MODEL ??
  "gpt-5.6-luna"

const ANALYST_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    marketSummary: {
      type: "string",
    },
    technicalSummary: {
      type: "string",
    },
    modelSummary: {
      type: "string",
    },
    uncertainty: {
      type: "string",
    },
    keyFactors: {
      type: "array",
      items: {
        type: "string",
      },
    },
    riskFactors: {
      type: "array",
      items: {
        type: "string",
      },
    },
    analystConclusion: {
      type: "string",
    },
  },
  required: [
    "marketSummary",
    "technicalSummary",
    "modelSummary",
    "uncertainty",
    "keyFactors",
    "riskFactors",
    "analystConclusion",
  ],
}

function extractOutputText(response: any): string | null {
  if (typeof response?.output_text === "string") {
    return response.output_text
  }

  const output = response?.output

  if (!Array.isArray(output)) {
    return null
  }

  for (const item of output) {
    if (
      item?.type !== "message" ||
      !Array.isArray(item?.content)
    ) {
      continue
    }

    for (const content of item.content) {
      if (
        content?.type === "output_text" &&
        typeof content?.text === "string"
      ) {
        return content.text
      }
    }
  }

  return null
}

export async function GET(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "OPENAI_API_KEY is not configured",
        },
        { status: 500 }
      )
    }

    const url = new URL(request.url)

    const symbol =
      url.searchParams.get("symbol")?.toUpperCase()

    const assetType =
      url.searchParams.get("assetType")

    const timeframe =
      url.searchParams.get("timeframe")

    const horizon =
      url.searchParams.get("horizon") ?? "6"

    if (!symbol) {
      return NextResponse.json(
        {
          success: false,
          error: "symbol is required",
        },
        { status: 400 }
      )
    }

    if (!assetType || !timeframe) {
      return NextResponse.json(
        {
          success: false,
          error:
            "assetType and timeframe are required",
        },
        { status: 400 }
      )
    }

    const contextUrl = new URL(
      "/api/market/intelligence/context",
      request.url
    )

    contextUrl.searchParams.set(
      "symbol",
      symbol
    )

    contextUrl.searchParams.set(
      "assetType",
      assetType
    )

    contextUrl.searchParams.set(
      "timeframe",
      timeframe
    )

    contextUrl.searchParams.set(
      "horizon",
      horizon
    )

    const contextResponse = await fetch(
      contextUrl,
      {
        cache: "no-store",
      }
    )

    const contextData =
      await contextResponse.json()

    if (
      !contextResponse.ok ||
      !contextData.success
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Market intelligence context failed",
          context: contextData,
        },
        { status: 502 }
      )
    }

    const context =
      contextData.context

    const instructions = `
You are the MarketX AI Market Analyst.

Your job is to interpret the supplied market intelligence context.

IMPORTANT RULES:

1. Do not invent market data.
2. Do not change, override, or recalculate the ML prediction.
3. Treat the Random Forest prediction and probabilities as model output.
4. Clearly distinguish factual market data, technical indicators, model output, and AI interpretation.
5. If probabilities are close to each other, explicitly describe the model signal as uncertain or weakly separated.
6. Do not claim certainty about future prices.
7. Do not invent news, events, causes, or external market information.
8. Do not provide personalized financial advice.
9. Do not convert the model output into an instruction to buy, sell, or hold.
10. Use only the supplied context.

Return a concise but informative structured analysis.
`

    const userInput = JSON.stringify(
      {
        task:
          "Analyze this MarketX intelligence context.",
        context,
      },
      null,
      2
    )

    const openaiResponse = await fetch(
      OPENAI_API_URL,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          Authorization:
            `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,

          instructions,

          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: userInput,
                },
              ],
            },
          ],

          text: {
            format: {
              type: "json_schema",
              name:
                "marketx_market_analysis",
              description:
                "Structured MarketX market analysis.",
              strict: true,
              schema:
                ANALYST_SCHEMA,
            },
          },

          store: false,
        }),
      }
    )

    const openaiData =
      await openaiResponse.json()

    if (!openaiResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error:
            "OpenAI Responses API failed",
          status:
            openaiResponse.status,
          detail: openaiData,
        },
        { status: 502 }
      )
    }

    const outputText =
      extractOutputText(openaiData)

    if (!outputText) {
      return NextResponse.json(
        {
          success: false,
          error:
            "OpenAI returned no output text",
        },
        { status: 502 }
      )
    }

    let analysis: unknown

    try {
      analysis =
        JSON.parse(outputText)
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "OpenAI output was not valid JSON",
          rawOutput: outputText,
        },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      version: "v5.2",
      source:
        "openai-responses-api",
      model: OPENAI_MODEL,
      contextVersion:
        contextData.contextVersion,
      assetType,
      symbol,
      timeframe,
      prediction:
        context.prediction,
      analysis,
    })
  } catch (error) {
    console.error(
      "AI analyst error:",
      error
    )

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    )
  }
}
