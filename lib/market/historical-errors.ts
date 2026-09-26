export type HistoricalProviderErrorCode =
  | "RATE_LIMIT"
  | "UPSTREAM_ERROR"
  | "NO_DATA"
  | "INVALID_DATA"

export class HistoricalProviderError
  extends Error {
  constructor(
    message: string,
    public readonly code:
      HistoricalProviderErrorCode
  ) {
    super(message)
    this.name =
      "HistoricalProviderError"
  }
}
