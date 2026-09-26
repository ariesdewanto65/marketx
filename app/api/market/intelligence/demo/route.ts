import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)

    const symbol =
      url.searchParams.get("symbol")?.toUpperCase() ?? "BTC"

    const assetType =
      url.searchParams.get("assetType") ?? "crypto"

    const timeframe =
      url.searchParams.get("timeframe") ?? "4h"

    const horizon =
      url.searchParams.get("horizon") ?? "6"

    const contextUrl = new URL(
      "/api/market/intelligence/context",
      request.url
    )

    contextUrl.searchParams.set("symbol", symbol)
    contextUrl.searchParams.set("assetType", assetType)
    contextUrl.searchParams.set("timeframe", timeframe)
    contextUrl.searchParams.set("horizon", horizon)

    const response = await fetch(contextUrl, {
      cache: "no-store",
    })

    const data = await response.json()

    if (!response.ok || !data.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Market intelligence context failed",
          detail: data,
        },
        { status: 502 }
      )
    }

    const context = data.context
    const technical = context.technical
    const prediction = context.prediction
    const market = context.market

    const rsi = Number(technical.rsi14)
    const macd = Number(technical.macd)
    const macdSignal = Number(technical.macdSignal)
    const momentum = Number(technical.momentum14)
    const volatility = Number(technical.volatility20)

    const probabilityGap =
      Math.max(
        Number(prediction.probabilities.DOWN ?? 0),
        Number(prediction.probabilities.NEUTRAL ?? 0),
        Number(prediction.probabilities.UP ?? 0)
      ) -
      Math.min(
        Number(prediction.probabilities.DOWN ?? 0),
        Number(prediction.probabilities.NEUTRAL ?? 0),
        Number(prediction.probabilities.UP ?? 0)
      )

    const keyFactors: string[] = []
    const riskFactors: string[] = []

    if (rsi < 30) {
      keyFactors.push(
        "RSI14 berada di bawah 30, menunjukkan kondisi oversold secara teknikal."
      )
    } else if (rsi < 40) {
      keyFactors.push(
        `RSI14 berada di ${rsi.toFixed(2)}, menunjukkan momentum relatif lemah.`
      )
    } else if (rsi > 70) {
      keyFactors.push(
        "RSI14 berada di atas 70, menunjukkan kondisi overbought secara teknikal."
      )
    } else {
      keyFactors.push(
        `RSI14 berada di ${rsi.toFixed(2)}, masih berada di area non-ekstrem.`
      )
    }

    if (macd < macdSignal) {
      keyFactors.push(
        "MACD berada di bawah signal line, sehingga momentum MACD saat ini cenderung negatif."
      )
    } else {
      keyFactors.push(
        "MACD berada di atas signal line, sehingga momentum MACD saat ini cenderung positif."
      )
    }

    if (momentum < 0) {
      keyFactors.push(
        `Momentum14 bernilai ${momentum.toFixed(2)}, menunjukkan perubahan harga historis yang masih negatif pada window indikator.`
      )
    } else {
      keyFactors.push(
        `Momentum14 bernilai ${momentum.toFixed(2)}, menunjukkan perubahan harga historis yang positif pada window indikator.`
      )
    }

    if (volatility > 0.02) {
      riskFactors.push(
        `Volatilitas20 relatif tinggi pada ${volatility.toFixed(4)}.`
      )
    } else {
      riskFactors.push(
        `Volatilitas20 tercatat ${volatility.toFixed(4)}.`
      )
    }

    if (probabilityGap < 0.10) {
      riskFactors.push(
        "Probabilitas model berdekatan sehingga pemisahan antar kelas relatif lemah."
      )
    } else {
      riskFactors.push(
        "Probabilitas model menunjukkan pemisahan antar kelas yang lebih jelas."
      )
    }

    const returnPercent = Number(technical.returnPercent)

    const marketReturnText = Number.isFinite(returnPercent)
      ? `${returnPercent.toFixed(2)}%`
      : "data tidak tersedia"

    const marketSummary =
      `${symbol} pada timeframe ${timeframe} terakhir berada pada harga ${market.close}. ` +
      `Perubahan candle terakhir tercatat ${marketReturnText}.`

    const technicalSummary =
      `RSI14 ${rsi.toFixed(2)}, MACD ${macd.toFixed(2)}, ` +
      `MACD Signal ${macdSignal.toFixed(2)}, dan Momentum14 ${momentum.toFixed(2)}.`

    const modelSummary =
      `Model ${prediction.model} menghasilkan prediksi ${prediction.prediction} ` +
      `dengan probabilitas DOWN ${(Number(prediction.probabilities.DOWN) * 100).toFixed(2)}%, ` +
      `NEUTRAL ${(Number(prediction.probabilities.NEUTRAL) * 100).toFixed(2)}%, ` +
      `dan UP ${(Number(prediction.probabilities.UP) * 100).toFixed(2)}%.`

    const uncertainty =
      probabilityGap < 0.10
        ? "Sinyal model masih lemah karena probabilitas antar kelas relatif berdekatan."
        : "Sinyal model memiliki pemisahan probabilitas yang lebih terlihat."

    const analystConclusion =
      `Data teknikal menunjukkan kondisi yang perlu dipantau, sementara model ML saat ini menghasilkan sinyal ${prediction.prediction}. ` +
      `Hasil ini merupakan interpretasi data dan output model, bukan kepastian arah harga berikutnya.`

    return NextResponse.json({
      success: true,
      version: "v5.2-demo",
      source: "marketx-demo-analyst",
      liveAI: false,
      providerStatus: "openai-credit-required",
      contextVersion: data.contextVersion,
      symbol,
      assetType,
      timeframe,
      horizon: Number(horizon),

      market: {
        close: market.close,
        returnPercent: market.returnPercent,
        timestamp: market.timestamp,
      },

      prediction,

      analysis: {
        marketSummary,
        technicalSummary,
        modelSummary,
        uncertainty,
        keyFactors,
        riskFactors,
        analystConclusion,
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
            : "Unknown error",
      },
      { status: 500 }
    )
  }
}


