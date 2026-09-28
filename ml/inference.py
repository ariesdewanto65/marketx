from .price_regression_api import run_price_prediction
import os

import pandas as pd
import requests

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from sklearn.impute import SimpleImputer
from sklearn.ensemble import RandomForestClassifier
from sklearn.calibration import CalibratedClassifierCV


app = FastAPI(
    title="MarketX ML Prediction Service",
    version="1.0.0",
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


class PredictionRequest(BaseModel):
    assetType: str
    symbol: str
    timeframe: str
    timestamp: str
    horizonCandles: int
    features: dict[str, float | None]


def train_model():
    base_url = os.getenv(
        "MARKETX_BASE_URL",
        "http://localhost:3000",
    )

    feature_url = (
        f"{base_url}/api/market/features"
        "?symbol=BTC"
        "&assetType=crypto"
        "&timeframe=4h"
    )

    label_url = (
        f"{base_url}/api/market/prediction/labels"
        "?symbol=BTC"
        "&assetType=crypto"
        "&timeframe=4h"
        "&horizon=6"
        "&threshold=0.5"
    )

    feature_response = requests.get(
        feature_url,
        timeout=30,
    )

    label_response = requests.get(
        label_url,
        timeout=30,
    )

    feature_response.raise_for_status()
    label_response.raise_for_status()

    feature_data = feature_response.json()
    label_data = label_response.json()

    if not feature_data.get("success"):
        raise RuntimeError(
            "Feature API failed"
        )

    if not label_data.get("success"):
        raise RuntimeError(
            "Label API failed"
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

    dataset = (
        dataset
        .sort_values("timestamp")
        .reset_index(drop=True)
    )

    if len(dataset) < 50:
        raise RuntimeError(
            "Training dataset is too small"
        )

    X = dataset[
        FEATURE_COLUMNS
    ]

    y = dataset[
        "direction"
    ]

    split_index = int(
        len(dataset) * 0.80
    )

    X_train = X.iloc[
        :split_index
    ]

    y_train = y.iloc[
        :split_index
    ]

    imputer = SimpleImputer(
        strategy="median"
    )

    X_train = imputer.fit_transform(
        X_train
    )

    base_model = RandomForestClassifier(
        n_estimators=300,
        max_depth=5,
        min_samples_leaf=3,
        random_state=42,
        n_jobs=-1,
    )

    model = CalibratedClassifierCV(
        estimator=base_model,
        method="sigmoid",
        cv=3,
    )

    model.fit(
        X_train,
        y_train,
    )

    return model, imputer


MODEL = None
IMPUTER = None


@app.on_event("startup")
def startup():
    global MODEL
    global IMPUTER

    print(
        "Training MarketX calibrated model..."
    )

    MODEL, IMPUTER = train_model()

    print(
        "MarketX ML model ready."
    )


@app.get("/health")
def health():
    return {
        "success": True,
        "service": "marketx-ml",
        "model": "random-forest-calibrated",
        "calibration": "sigmoid",
    }


@app.post("/predict")
def predict(
    request: PredictionRequest,
):
    if MODEL is None or IMPUTER is None:
        raise HTTPException(
            status_code=503,
            detail="ML model is not ready",
        )

    if request.assetType not in [
        "stock",
        "crypto",
    ]:
        raise HTTPException(
            status_code=400,
            detail="Invalid assetType",
        )

    if request.timeframe not in [
        "1d",
        "4h",
    ]:
        raise HTTPException(
            status_code=400,
            detail="Invalid timeframe",
        )

    missing = [
        column
        for column in FEATURE_COLUMNS
        if column not in request.features
    ]

    if missing:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Missing features",
                "features": missing,
            },
        )

    row = {}

    for column in FEATURE_COLUMNS:
        row[column] = request.features[column]

    X = pd.DataFrame(
        [row],
        columns=FEATURE_COLUMNS,
    )

    X = IMPUTER.transform(X)

    prediction = MODEL.predict(X)[0]

    probabilities = MODEL.predict_proba(X)[0]

    classes = list(
        MODEL.classes_
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

    if abs(
        probability_sum - 1.0
    ) > 0.00001:
        raise HTTPException(
            status_code=500,
            detail="Invalid probability distribution",
        )

    selected_probability = (
        probability_map[
            str(prediction)
        ]
    )

    return {
        "success": True,
        "assetType": request.assetType,
        "symbol": request.symbol,
        "timeframe": request.timeframe,
        "timestamp": request.timestamp,
        "horizonCandles": request.horizonCandles,
        "prediction": str(prediction),
        "probabilities": probability_map,
        "probability": selected_probability,
        "model": "random-forest-calibrated",
        "calibration": "sigmoid",
    }

@app.get("/price-prediction")
def price_prediction(
    symbol: str,
    assetType: str = "crypto",
    timeframe: str = "4h",
    horizon: int = 6,
):
    allowed_asset_types = {"stock", "crypto"}
    allowed_timeframes = {"1d", "4h"}

    if assetType not in allowed_asset_types:
        return {
            "success": False,
            "error": f"Unsupported assetType: {assetType}",
        }

    if timeframe not in allowed_timeframes:
        return {
            "success": False,
            "error": f"Unsupported timeframe: {timeframe}",
        }

    if horizon < 1 or horizon > 30:
        return {
            "success": False,
            "error": "horizon must be between 1 and 30",
        }

    try:
        return run_price_prediction(
            symbol=symbol.upper(),
            asset_type=assetType,
            timeframe=timeframe,
            horizon=horizon,
        )

    except Exception as error:
        return {
            "success": False,
            "error": str(error),
        }

