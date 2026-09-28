import math
import os
from typing import Any

import requests
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, mean_squared_error


MARKETX_API_BASE = os.getenv(
    "MARKETX_API_BASE",
    "http://localhost:3000",
)

ASSET_TYPE = "crypto"
SYMBOL = "BTC"
TIMEFRAME = "4h"
HORIZON_CANDLES = 6

FEATURE_COLUMNS = [
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
]


def get_json(url: str) -> dict[str, Any]:
    response = requests.get(url, timeout=60)
    response.raise_for_status()
    return response.json()


def load_features() -> list[dict[str, Any]]:
    url = (
        f"{MARKETX_API_BASE}/api/market/features"
        f"?symbol={SYMBOL}"
        f"&assetType={ASSET_TYPE}"
        f"&timeframe={TIMEFRAME}"
    )

    payload = get_json(url)

    if not payload.get("success"):
        raise RuntimeError(f"Feature API failed: {payload}")

    features = payload.get("features", [])

    if not features:
        raise RuntimeError("Feature API returned zero features.")

    return features


def load_labels() -> list[dict[str, Any]]:
    url = (
        f"{MARKETX_API_BASE}/api/market/prediction/labels"
        f"?symbol={SYMBOL}"
        f"&assetType={ASSET_TYPE}"
        f"&timeframe={TIMEFRAME}"
        f"&horizon={HORIZON_CANDLES}"
        f"&threshold=0.5"
    )

    payload = get_json(url)

    if not payload.get("success"):
        raise RuntimeError(f"Label API failed: {payload}")

    labels = payload.get("labels", [])

    if not labels:
        raise RuntimeError("Label API returned zero labels.")

    return labels


def build_dataset(
    features: list[dict[str, Any]],
    labels: list[dict[str, Any]],
):
    label_by_timestamp = {
        item["timestamp"]: item
        for item in labels
    }

    rows = []

    for feature in features:
        timestamp = feature.get("timestamp")
        label = label_by_timestamp.get(timestamp)

        if not label:
            continue

        target = label.get("futureReturnPercent")
        current_close = label.get("currentClose")
        future_close = label.get("futureClose")

        if target is None or current_close is None or future_close is None:
            continue

        row = {
            "timestamp": timestamp,
            "currentClose": float(current_close),
            "futureClose": float(future_close),
            "futureReturnPercent": float(target),
        }

        for column in FEATURE_COLUMNS:
            value = feature.get(column)

            if value is None:
                row[column] = np.nan
            else:
                row[column] = float(value)

        rows.append(row)

    rows.sort(key=lambda x: x["timestamp"])

    if len(rows) < 30:
        raise RuntimeError(
            f"Not enough aligned rows for regression: {len(rows)}"
        )

    return rows


def train_and_evaluate(rows):
    X = np.array(
        [
            [row[column] for column in FEATURE_COLUMNS]
            for row in rows
        ],
        dtype=float,
    )

    y = np.array(
        [row["futureReturnPercent"] for row in rows],
        dtype=float,
    )

    imputer = SimpleImputer(strategy="median")
    X = imputer.fit_transform(X)

    split_index = int(len(rows) * 0.8)

    if split_index <= 0 or split_index >= len(rows):
        raise RuntimeError("Invalid chronological train/test split.")

    X_train = X[:split_index]
    X_test = X[split_index:]

    y_train = y[:split_index]
    y_test = y[split_index:]

    model = RandomForestRegressor(
        n_estimators=300,
        max_depth=6,
        min_samples_leaf=3,
        random_state=42,
        n_jobs=-1,
    )

    model.fit(X_train, y_train)

    predictions = model.predict(X_test)

    mae = mean_absolute_error(y_test, predictions)
    rmse = math.sqrt(mean_squared_error(y_test, predictions))

    actual_direction = np.sign(y_test)
    predicted_direction = np.sign(predictions)

    directional_accuracy = float(
        np.mean(actual_direction == predicted_direction) * 100
    )

    mean_abs_actual = float(np.mean(np.abs(y_test)))

    if mean_abs_actual > 0:
        normalized_mae = float(mae / mean_abs_actual * 100)
    else:
        normalized_mae = 0.0

    print("")
    print("==============================================")
    print(" MARKETX FUTURE CLOSE REGRESSION")
    print("==============================================")
    print(f"Asset              : {ASSET_TYPE}")
    print(f"Symbol             : {SYMBOL}")
    print(f"Timeframe          : {TIMEFRAME}")
    print(f"Horizon            : {HORIZON_CANDLES} candles")
    print(f"Horizon duration   : 24 hours")
    print("----------------------------------------------")
    print(f"Dataset rows       : {len(rows)}")
    print(f"Train rows         : {len(X_train)}")
    print(f"Test rows          : {len(X_test)}")
    print("----------------------------------------------")
    print(f"MAE return (%)     : {mae:.6f}")
    print(f"RMSE return (%)    : {rmse:.6f}")
    print(f"Normalized MAE     : {normalized_mae:.2f}%")
    print(f"Direction accuracy : {directional_accuracy:.2f}%")
    print("==============================================")

    return model, imputer


def predict_latest(
    model,
    imputer,
    rows: list[dict[str, Any]],
):
    latest = rows[-1]

    X_latest = np.array(
        [[latest[column] for column in FEATURE_COLUMNS]],
        dtype=float,
    )

    X_latest = imputer.transform(X_latest)

    predicted_return = float(model.predict(X_latest)[0])

    current_close = latest["currentClose"]

    predicted_close = current_close * (
        1.0 + predicted_return / 100.0
    )

    print("")
    print("==============================================")
    print(" LATEST FUTURE CLOSE PREDICTION")
    print("==============================================")
    print(f"Timestamp          : {latest['timestamp']}")
    print(f"Current close      : {current_close:.2f}")
    print(f"Predicted return   : {predicted_return:.4f}%")
    print(f"Predicted close    : {predicted_close:.2f}")
    print("----------------------------------------------")
    print(
        f"Target timestamp   : {latest.get('futureTimestamp', 'from label')}"
    )
    print("==============================================")


def main():
    print("Loading MarketX features...")
    features = load_features()

    print(f"Features loaded: {len(features)}")

    print("Loading prediction labels...")
    labels = load_labels()

    print(f"Labels loaded: {len(labels)}")

    print("Building aligned regression dataset...")
    rows = build_dataset(features, labels)

    print(f"Aligned rows: {len(rows)}")

    model, imputer = train_and_evaluate(rows)

    predict_latest(model, imputer, rows)


if __name__ == "__main__":
    main()