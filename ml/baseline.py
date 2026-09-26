import requests
import pandas as pd

from sklearn.impute import SimpleImputer
from sklearn.ensemble import RandomForestClassifier
from sklearn.calibration import CalibratedClassifierCV


BASE_URL = "http://localhost:3000"

SYMBOL = "BTC"
ASSET_TYPE = "crypto"
TIMEFRAME = "4h"

HORIZON = 6
THRESHOLD = 0.5


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


def fetch_json(url):
    response = requests.get(
        url,
        timeout=30,
    )

    response.raise_for_status()

    data = response.json()

    if not data.get("success"):
        raise RuntimeError(
            f"API request failed: {data}"
        )

    return data


def prepare_dataset():
    feature_url = (
        f"{BASE_URL}/api/market/features"
        f"?symbol={SYMBOL}"
        f"&assetType={ASSET_TYPE}"
        f"&timeframe={TIMEFRAME}"
    )

    label_url = (
        f"{BASE_URL}/api/market/prediction/labels"
        f"?symbol={SYMBOL}"
        f"&assetType={ASSET_TYPE}"
        f"&timeframe={TIMEFRAME}"
        f"&horizon={HORIZON}"
        f"&threshold={THRESHOLD}"
    )

    feature_data = fetch_json(
        feature_url
    )

    label_data = fetch_json(
        label_url
    )

    if not feature_data["validation"]["valid"]:
        raise RuntimeError(
            "Feature validation failed."
        )

    features = pd.DataFrame(
        feature_data["features"]
    )

    labels = pd.DataFrame(
        label_data["labels"]
    )

    dataset = features.merge(
        labels[
            [
                "timestamp",
                "direction",
            ]
        ],
        on="timestamp",
        how="inner",
    )

    dataset["timestamp"] = pd.to_datetime(
        dataset["timestamp"],
        utc=True,
    )

    dataset = (
        dataset
        .sort_values("timestamp")
        .reset_index(drop=True)
    )

    return dataset


def train_model(
    X_train,
    y_train,
):
    base_model = RandomForestClassifier(
        n_estimators=300,
        max_depth=5,
        min_samples_leaf=3,
        random_state=42,
        n_jobs=-1,
    )

    calibrated_model = CalibratedClassifierCV(
        estimator=base_model,
        method="sigmoid",
        cv=3,
    )

    calibrated_model.fit(
        X_train,
        y_train,
    )

    return calibrated_model


def main():
    print("=" * 70)
    print(
        "MARKETX V4.9 - ML PREDICTION BRIDGE"
    )
    print("=" * 70)

    dataset = prepare_dataset()

    print(
        f"\nDataset rows: {len(dataset)}"
    )

    if len(dataset) < 50:
        raise RuntimeError(
            "Dataset is too small for inference."
        )

    X = dataset[
        FEATURE_COLUMNS
    ].copy()

    y = dataset[
        "direction"
    ].copy()

    split_index = int(
        len(dataset) * 0.80
    )

    X_train = X.iloc[
        :split_index
    ]

    X_latest = X.iloc[
        [len(dataset) - 1]
    ]

    y_train = y.iloc[
        :split_index
    ]

    latest_timestamp = dataset.iloc[
        -1
    ]["timestamp"]

    imputer = SimpleImputer(
        strategy="median"
    )

    X_train_imputed = (
        imputer.fit_transform(
            X_train
        )
    )

    X_latest_imputed = (
        imputer.transform(
            X_latest
        )
    )

    print(
        f"Training rows: {len(X_train)}"
    )

    print(
        f"Latest timestamp: "
        f"{latest_timestamp}"
    )

    print(
        "\nTraining calibrated model..."
    )

    model = train_model(
        X_train_imputed,
        y_train,
    )

    prediction = model.predict(
        X_latest_imputed
    )[0]

    probabilities = (
        model.predict_proba(
            X_latest_imputed
        )[0]
    )

    classes = list(
        model.classes_
    )

    probability_map = {}

    for index, class_name in enumerate(
        classes
    ):
        probability_map[
            str(class_name)
        ] = round(
            float(
                probabilities[index]
            ),
            6,
        )

    probability_sum = sum(
        probability_map.values()
    )

    print(
        "\nMODEL CLASSES:"
    )

    print(classes)

    print(
        "\nPREDICTION:"
    )

    print(prediction)

    print(
        "\nPROBABILITIES:"
    )

    print(
        probability_map
    )

    print(
        f"\nProbability sum: "
        f"{probability_sum:.6f}"
    )

    if abs(
        probability_sum - 1.0
    ) > 0.00001:
        raise RuntimeError(
            "Probability distribution "
            "does not sum to 1."
        )

    selected_probability = (
        probability_map[
            str(prediction)
        ]
    )

    signal = {
        "assetType": ASSET_TYPE,
        "symbol": SYMBOL,
        "timeframe": TIMEFRAME,
        "timestamp": str(
            latest_timestamp
        ),
        "horizonCandles": HORIZON,
        "prediction": str(
            prediction
        ),
        "probabilities": probability_map,
        "probability": selected_probability,
        "model": (
            "random-forest-calibrated"
        ),
        "calibration": "sigmoid",
    }

    print(
        "\nPREDICTION SIGNAL:"
    )

    print(signal)

    print(
        "\nRESULT_JSON="
    )

    print(
        {
            "success": True,
            "model": (
                "random-forest-calibrated"
            ),
            "calibration": "sigmoid",
            "datasetRows": len(dataset),
            "trainingRows": len(X_train),
            "latestTimestamp": str(
                latest_timestamp
            ),
            "prediction": str(
                prediction
            ),
            "probabilities": probability_map,
            "probability": selected_probability,
            "probabilitySum": probability_sum,
        }
    )

    print(
        "\nV4.9 ML INFERENCE ENGINE COMPLETE"
    )


if __name__ == "__main__":
    main()

