import math
import os
from typing import Any

import requests
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer


MARKETX_API_BASE = os.getenv(
    "MARKETX_API_BASE",
    "http://localhost:3000",
)

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


def load_features(
    symbol: str,
    asset_type: str,
    timeframe: str,
) -> list[dict[str, Any]]:

    url = (
        f"{MARKETX_API_BASE}/api/market/features"
        f"?symbol={symbol}"
        f"&assetType={asset_type}"
        f"&timeframe={timeframe}"
    )

    payload = get_json(url)

    if not payload.get("success"):
        raise RuntimeError(f"Feature API failed: {payload}")

    return payload.get("features", [])


def load_labels(
    symbol: str,
    asset_type: str,
    timeframe: str,
    horizon: int,
) -> list[dict[str, Any]]:

    url = (
        f"{MARKETX_API_BASE}/api/market/prediction/labels"
        f"?symbol={symbol}"
        f"&assetType={asset_type}"
        f"&timeframe={timeframe}"
        f"&horizon={horizon}"
        f"&threshold=0.5"
    )

    payload = get_json(url)

    if not payload.get("success"):
        raise RuntimeError(f"Label API failed: {payload}")

    return payload.get("labels", [])


def build_dataset(features, labels):

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

        future_return = label.get("futureReturnPercent")

        if future_return is None:
            continue

        row = {
            "timestamp": timestamp,
            "currentClose": float(label["currentClose"]),
            "futureClose": float(label["futureClose"]),
            "futureReturnPercent": float(future_return),
        }

        for column in FEATURE_COLUMNS:

            value = feature.get(column)

            row[column] = (
                np.nan
                if value is None
                else float(value)
            )

        rows.append(row)

    rows.sort(key=lambda x: x["timestamp"])

    return rows


def train_regressor(rows):

    if len(rows) < 60:
        raise RuntimeError(
            f"Not enough rows for regression: {len(rows)}"
        )

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

    model = RandomForestRegressor(
        n_estimators=300,
        max_depth=5,
        min_samples_leaf=3,
        random_state=42,
        n_jobs=-1,
    )

    model.fit(X, y)

    return model, imputer


def predict_latest(
    model,
    imputer,
    latest_feature,
    current_close,
):

    X_latest = np.array(
        [
            [
                latest_feature.get(column)
                for column in FEATURE_COLUMNS
            ]
        ],
        dtype=float,
    )

    X_latest = imputer.transform(X_latest)

    predicted_return = float(
        model.predict(X_latest)[0]
    )

    predicted_close = float(
        current_close
        * (1.0 + predicted_return / 100.0)
    )

    return {
        "predictedReturnPercent": predicted_return,
        "predictedClose": predicted_close,
    }


def run_price_prediction(
    symbol: str,
    asset_type: str,
    timeframe: str,
    horizon: int,
):

    features = load_features(
        symbol,
        asset_type,
        timeframe,
    )

    labels = load_labels(
        symbol,
        asset_type,
        timeframe,
        horizon,
    )

    if not features:
        raise RuntimeError("No features returned.")

    if not labels:
        raise RuntimeError("No prediction labels returned.")

    rows = build_dataset(
        features,
        labels,
    )

    model, imputer = train_regressor(rows)

    latest_feature = features[-1]

    current_close = float(
        latest_feature["close"]
    )

    prediction = predict_latest(
        model,
        imputer,
        latest_feature,
        current_close,
    )

    return {
        "success": True,
        "assetType": asset_type,
        "symbol": symbol,
        "timeframe": timeframe,
        "currentClose": current_close,
        "predictedReturnPercent": prediction[
            "predictedReturnPercent"
        ],
        "predictedClose": prediction[
            "predictedClose"
        ],
        "horizonCandles": horizon,
        "horizonHours": (
            horizon * 4
            if timeframe == "4h"
            else horizon * 24
        ),
        "model": "random-forest-regressor",
        "configuration": {
            "nEstimators": 300,
            "maxDepth": 5,
            "minSamplesLeaf": 3,
        },
        "training": {
            "featureRows": len(features),
            "alignedRows": len(rows),
        },
    }