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

    return payload.get("features", [])


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

        target = label.get("futureReturnPercent")

        if target is None:
            continue

        row = {
            "timestamp": timestamp,
            "currentClose": float(label["currentClose"]),
            "futureClose": float(label["futureClose"]),
            "futureReturnPercent": float(target),
        }

        for column in FEATURE_COLUMNS:
            value = feature.get(column)
            row[column] = np.nan if value is None else float(value)

        rows.append(row)

    rows.sort(key=lambda x: x["timestamp"])

    return rows


def create_model(config):
    return RandomForestRegressor(
        n_estimators=config["n_estimators"],
        max_depth=config["max_depth"],
        min_samples_leaf=config["min_samples_leaf"],
        random_state=42,
        n_jobs=-1,
    )


def evaluate_model(rows, config, min_train_size=60):
    predictions = []
    actuals = []

    total = len(rows)

    for test_index in range(min_train_size, total):
        train_rows = rows[:test_index]
        test_row = rows[test_index]

        X_train = np.array(
            [
                [row[column] for column in FEATURE_COLUMNS]
                for row in train_rows
            ],
            dtype=float,
        )

        y_train = np.array(
            [row["futureReturnPercent"] for row in train_rows],
            dtype=float,
        )

        X_test = np.array(
            [[test_row[column] for column in FEATURE_COLUMNS]],
            dtype=float,
        )

        y_test = float(test_row["futureReturnPercent"])

        imputer = SimpleImputer(strategy="median")

        X_train = imputer.fit_transform(X_train)
        X_test = imputer.transform(X_test)

        model = create_model(config)
        model.fit(X_train, y_train)

        prediction = float(model.predict(X_test)[0])

        predictions.append(prediction)
        actuals.append(y_test)

    predictions = np.array(predictions)
    actuals = np.array(actuals)

    mae = float(mean_absolute_error(actuals, predictions))
    rmse = float(
        math.sqrt(mean_squared_error(actuals, predictions))
    )

    non_zero = np.abs(actuals) > 1e-9

    if np.any(non_zero):
        mape = float(
            np.mean(
                np.abs(
                    (actuals[non_zero] - predictions[non_zero])
                    / actuals[non_zero]
                )
            )
            * 100
        )
    else:
        mape = 0.0

    directional_accuracy = float(
        np.mean(
            np.sign(actuals) == np.sign(predictions)
        )
        * 100
    )

    return {
        "mae": mae,
        "rmse": rmse,
        "mape": mape,
        "directionalAccuracy": directional_accuracy,
        "predictions": predictions,
        "actuals": actuals,
    }


def main():
    print("")
    print("==============================================")
    print(" MARKETX V5.7.2 REGRESSION VALIDATION")
    print("==============================================")

    print("Loading features...")
    features = load_features()
    print(f"Features: {len(features)}")

    print("Loading labels...")
    labels = load_labels()
    print(f"Labels: {len(labels)}")

    rows = build_dataset(features, labels)

    print(f"Aligned rows: {len(rows)}")
    print("")

    configurations = [
        {
            "name": "RF-A",
            "n_estimators": 200,
            "max_depth": 4,
            "min_samples_leaf": 3,
        },
        {
            "name": "RF-B",
            "n_estimators": 300,
            "max_depth": 5,
            "min_samples_leaf": 3,
        },
        {
            "name": "RF-C",
            "n_estimators": 300,
            "max_depth": 6,
            "min_samples_leaf": 3,
        },
        {
            "name": "RF-D",
            "n_estimators": 500,
            "max_depth": 6,
            "min_samples_leaf": 5,
        },
    ]

    results = []

    for config in configurations:
        print("----------------------------------------------")
        print(
            f"Testing {config['name']} | "
            f"trees={config['n_estimators']} | "
            f"depth={config['max_depth']} | "
            f"leaf={config['min_samples_leaf']}"
        )

        metrics = evaluate_model(rows, config)

        results.append({
            "name": config["name"],
            "mae": metrics["mae"],
            "rmse": metrics["rmse"],
            "mape": metrics["mape"],
            "directionalAccuracy": metrics["directionalAccuracy"],
        })

        print(f"MAE                 : {metrics['mae']:.6f}%")
        print(f"RMSE                : {metrics['rmse']:.6f}%")
        print(f"MAPE                : {metrics['mape']:.2f}%")
        print(
            f"Direction accuracy  : "
            f"{metrics['directionalAccuracy']:.2f}%"
        )

    print("")
    print("==============================================")
    print(" VALIDATION SUMMARY")
    print("==============================================")

    for result in results:
        print(
            f"{result['name']} | "
            f"MAE={result['mae']:.4f}% | "
            f"RMSE={result['rmse']:.4f}% | "
            f"MAPE={result['mape']:.2f}% | "
            f"Direction={result['directionalAccuracy']:.2f}%"
        )

    best = min(results, key=lambda item: item["mae"])

    print("----------------------------------------------")
    print(f"Lowest MAE configuration: {best['name']}")
    print("==============================================")
    print("")


if __name__ == "__main__":
    main()