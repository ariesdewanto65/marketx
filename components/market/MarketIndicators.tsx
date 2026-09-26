"use client"

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

function getRange(values: (number | null)[]) {
  const clean = values.filter(
    (value): value is number =>
      typeof value === "number" &&
      Number.isFinite(value)
  )

  if (clean.length === 0) {
    return { min: 0, max: 1 }
  }

  const min = Math.min(...clean)
  const max = Math.max(...clean)

  return {
    min,
    max: max === min ? min + 1 : max,
  }
}

function buildPoints(
  values: (number | null)[],
  min: number,
  max: number,
  width = 760,
  height = 180,
  padding = 12
) {
  const range = max - min || 1

  return values
    .map((value, index) => {
      if (
        typeof value !== "number" ||
        !Number.isFinite(value)
      ) {
        return null
      }

      const x =
        padding +
        (index /
          Math.max(values.length - 1, 1)) *
          (width - padding * 2)

      const y =
        height -
        padding -
        ((value - min) / range) *
          (height - padding * 2)

      return `${x},${y}`
    })
    .filter(
      (point): point is string =>
        point !== null
    )
    .join(" ")
}

function ReferenceLine({
  value,
  min,
  max,
  width = 760,
  height = 180,
  padding = 12,
}: {
  value: number
  min: number
  max: number
  width?: number
  height?: number
  padding?: number
}) {
  const range = max - min || 1

  const y =
    height -
    padding -
    ((value - min) / range) *
      (height - padding * 2)

  return (
    <line
      x1={padding}
      x2={width - padding}
      y1={y}
      y2={y}
      stroke="#d1d5db"
      strokeDasharray="5 5"
    />
  )
}

function TechnicalChart({
  values,
  min,
  max,
  referenceLines = [],
}: {
  values: (number | null)[]
  min?: number
  max?: number
  referenceLines?: number[]
}) {
  const width = 760
  const height = 180
  const padding = 12

  const range = getRange(values)

  const chartMin = min ?? range.min
  const chartMax = max ?? range.max

  const points = buildPoints(
    values,
    chartMin,
    chartMax,
    width,
    height,
    padding
  )

  if (!points) {
    return (
      <div className="flex h-[180px] items-center justify-center text-sm text-gray-400">
        Insufficient indicator data
      </div>
    )
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-[180px] w-full"
      preserveAspectRatio="none"
    >
      {referenceLines.map(
        (value) => (
          <ReferenceLine
            key={value}
            value={value}
            min={chartMin}
            max={chartMax}
            width={width}
            height={height}
            padding={padding}
          />
        )
      )}

      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

function MacdChart({
  macd,
  signal,
  histogram,
}: {
  macd: (number | null)[]
  signal: (number | null)[]
  histogram: (number | null)[]
}) {
  const width = 760
  const height = 220
  const padding = 12

  const allValues = [
    ...macd,
    ...signal,
    ...histogram,
    0,
  ]

  const range = getRange(allValues)

  const macdPoints = buildPoints(
    macd,
    range.min,
    range.max,
    width,
    height,
    padding
  )

  const signalPoints = buildPoints(
    signal,
    range.min,
    range.max,
    width,
    height,
    padding
  )

  const histogramClean = histogram.filter(
    (value): value is number =>
      typeof value === "number" &&
      Number.isFinite(value)
  )

  const valueRange =
    range.max - range.min || 1

  const zeroY =
    height -
    padding -
    ((0 - range.min) / valueRange) *
      (height - padding * 2)

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-[220px] w-full"
      preserveAspectRatio="none"
    >
      <line
        x1={padding}
        x2={width - padding}
        y1={zeroY}
        y2={zeroY}
        stroke="#d1d5db"
        strokeDasharray="5 5"
      />

      {histogramClean.map(
        (value, index) => {
          const x =
            padding +
            (index /
              Math.max(
                histogram.length - 1,
                1
              )) *
              (width - padding * 2)

          const barWidth = Math.max(
            2,
            (width - padding * 2) /
              Math.max(
                histogram.length,
                1
              ) *
              0.65
          )

          const y =
            height -
            padding -
            ((value - range.min) /
              valueRange) *
              (height - padding * 2)

          const top = Math.min(
            zeroY,
            y
          )

          const barHeight = Math.max(
            1,
            Math.abs(zeroY - y)
          )

          return (
            <rect
              key={index}
              x={x - barWidth / 2}
              y={top}
              width={barWidth}
              height={barHeight}
              fill="#d1d5db"
            />
          )
        }
      )}

      <polyline
        points={macdPoints}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        vectorEffect="non-scaling-stroke"
      />

      <polyline
        points={signalPoints}
        fill="none"
        stroke="#6b7280"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
        strokeDasharray="6 4"
      />
    </svg>
  )
}

function BollingerChart({
  close,
  upper,
  middle,
  lower,
}: {
  close: (number | null)[]
  upper: (number | null)[]
  middle: (number | null)[]
  lower: (number | null)[]
}) {
  const width = 760
  const height = 240
  const padding = 12

  const allValues = [
    ...close,
    ...upper,
    ...middle,
    ...lower,
  ]

  const range = getRange(allValues)

  const closePoints = buildPoints(
    close,
    range.min,
    range.max,
    width,
    height,
    padding
  )

  const upperPoints = buildPoints(
    upper,
    range.min,
    range.max,
    width,
    height,
    padding
  )

  const middlePoints = buildPoints(
    middle,
    range.min,
    range.max,
    width,
    height,
    padding
  )

  const lowerPoints = buildPoints(
    lower,
    range.min,
    range.max,
    width,
    height,
    padding
  )

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-[240px] w-full"
      preserveAspectRatio="none"
    >
      <polyline
        points={upperPoints}
        fill="none"
        stroke="#9ca3af"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />

      <polyline
        points={middlePoints}
        fill="none"
        stroke="#6b7280"
        strokeWidth="1.5"
        strokeDasharray="6 4"
        vectorEffect="non-scaling-stroke"
      />

      <polyline
        points={lowerPoints}
        fill="none"
        stroke="#9ca3af"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />

      <polyline
        points={closePoints}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

function MetricCard({
  title,
  value,
  subtitle,
}: {
  title: string
  value: string
  subtitle: string
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="text-xs font-semibold tracking-wide text-gray-500">
        {title}
      </div>

      <div className="mt-2 text-2xl font-bold text-gray-900">
        {value}
      </div>

      <div className="mt-1 text-xs text-gray-500">
        {subtitle}
      </div>
    </div>
  )
}

export default function MarketIndicators({
  features,
}: {
  features: Feature[]
}) {
  const latest =
    features[features.length - 1]

  if (!latest) {
    return null
  }

  const rsiValues =
    features.map(
      (feature) => feature.rsi14
    )

  const macdValues =
    features.map(
      (feature) => feature.macd
    )

  const macdSignalValues =
    features.map(
      (feature) => feature.macdSignal
    )

  const macdHistogramValues =
    features.map(
      (feature) => feature.macdHistogram
    )

  const closeValues =
    features.map(
      (feature) => feature.close
    )

  const upperValues =
    features.map(
      (feature) =>
        feature.bollingerUpper20
    )

  const middleValues =
    features.map(
      (feature) =>
        feature.bollingerMiddle20
    )

  const lowerValues =
    features.map(
      (feature) =>
        feature.bollingerLower20
    )

  return (
    <section className="mt-6 space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">
          Technical Intelligence
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Technical indicators calculated by
          MarketX Feature Engine V3
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold text-gray-900">
                RSI 14
              </div>

              <div className="text-xs text-gray-500">
                Relative Strength Index
              </div>
            </div>

            <div className="text-2xl font-bold text-gray-900">
              {latest.rsi14?.toFixed(2) ?? "-"}
            </div>
          </div>

          <div className="mt-2 flex justify-between text-xs text-gray-400">
            <span>30 Oversold</span>
            <span>50 Midline</span>
            <span>70 Overbought</span>
          </div>

          <div className="mt-2 text-gray-900">
            <TechnicalChart
              values={rsiValues}
              min={0}
              max={100}
              referenceLines={[
                30,
                50,
                70,
              ]}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold text-gray-900">
                MACD
              </div>

              <div className="text-xs text-gray-500">
                12 / 26 / 9
              </div>
            </div>

            <div className="text-right text-xs text-gray-500">
              <div>
                MACD{" "}
                {latest.macd?.toFixed(2) ?? "-"}
              </div>

              <div>
                Signal{" "}
                {latest.macdSignal?.toFixed(2) ?? "-"}
              </div>

              <div>
                Histogram{" "}
                {latest.macdHistogram?.toFixed(2) ?? "-"}
              </div>
            </div>
          </div>

          <div className="mt-4 text-xs text-gray-400">
            Solid = MACD · Dashed = Signal · Bars = Histogram
          </div>

          <div className="mt-1 text-gray-900">
            <MacdChart
              macd={macdValues}
              signal={macdSignalValues}
              histogram={macdHistogramValues}
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-gray-900">
              Bollinger Bands
            </div>

            <div className="text-xs text-gray-500">
              Period 20 · Standard deviation 2
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-right text-xs text-gray-500 sm:grid-cols-4">
            <div>
              <div>Upper</div>
              <div className="font-semibold text-gray-900">
                {latest.bollingerUpper20?.toFixed(2) ?? "-"}
              </div>
            </div>

            <div>
              <div>Middle</div>
              <div className="font-semibold text-gray-900">
                {latest.bollingerMiddle20?.toFixed(2) ?? "-"}
              </div>
            </div>

            <div>
              <div>Lower</div>
              <div className="font-semibold text-gray-900">
                {latest.bollingerLower20?.toFixed(2) ?? "-"}
              </div>
            </div>

            <div>
              <div>Width</div>
              <div className="font-semibold text-gray-900">
                {latest.bollingerWidth20?.toFixed(2) ?? "-"}%
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
          <span>Price = solid</span>
          <span>Upper / Lower = band</span>
          <span>Middle = dashed</span>
        </div>

        <div className="mt-1 text-gray-900">
          <BollingerChart
            close={closeValues}
            upper={upperValues}
            middle={middleValues}
            lower={lowerValues}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="ATR 14"
          value={
            latest.atr14?.toFixed(2) ?? "-"
          }
          subtitle="Average True Range"
        />

        <MetricCard
          title="MOMENTUM 14"
          value={
            latest.momentum14?.toFixed(2) ?? "-"
          }
          subtitle="Price momentum"
        />

        <MetricCard
          title="VOLATILITY 20"
          value={
            latest.volatility20?.toFixed(4) ?? "-"
          }
          subtitle="Log-return volatility"
        />

        <MetricCard
          title="RETURN"
          value={
            latest.returnPercent !== null
              ? `${latest.returnPercent.toFixed(2)}%`
              : "-"
          }
          subtitle="Latest candle return"
        />
      </div>
    </section>
  )
}
