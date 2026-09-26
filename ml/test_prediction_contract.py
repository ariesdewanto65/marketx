import requests


URL = (
    "http://localhost:3000"
    "/api/market/prediction/signal"
    "?symbol=BTC"
    "&assetType=crypto"
    "&timeframe=4h"
    "&horizon=6"
)


def fail(message):
    raise RuntimeError(
        f"FAIL - {message}"
    )


def main():
    print("=" * 70)
    print(
        "MARKETX V4.9.5 - "
        "END-TO-END PREDICTION CONTRACT"
    )
    print("=" * 70)

    response = requests.get(
        URL,
        timeout=30,
    )

    print(
        f"\nHTTP status: "
        f"{response.status_code}"
    )

    response.raise_for_status()

    data = response.json()

    if data.get("success") is not True:
        fail(
            "success is not true"
        )

    if data.get("source") != "python-ml-service":
        fail(
            "source is not python-ml-service"
        )

    if data.get("assetType") != "crypto":
        fail(
            "assetType is not crypto"
        )

    if data.get("symbol") != "BTC":
        fail(
            "symbol is not BTC"
        )

    if data.get("timeframe") != "4h":
        fail(
            "timeframe is not 4h"
        )

    if data.get("candleCount", 0) <= 0:
        fail(
            "candleCount is invalid"
        )

    if data.get("featureCount", 0) <= 0:
        fail(
            "featureCount is invalid"
        )

    signal = data.get("signal")

    if not isinstance(signal, dict):
        fail(
            "signal object is missing"
        )

    prediction = signal.get(
        "prediction"
    )

    valid_predictions = {
        "UP",
        "DOWN",
        "NEUTRAL",
    }

    if prediction not in valid_predictions:
        fail(
            "invalid prediction"
        )

    probabilities = signal.get(
        "probabilities"
    )

    if not isinstance(
        probabilities,
        dict,
    ):
        fail(
            "probabilities object is missing"
        )

    required_classes = {
        "DOWN",
        "NEUTRAL",
        "UP",
    }

    if set(probabilities.keys()) != required_classes:
        fail(
            "probability classes do not match"
        )

    for class_name in required_classes:
        value = probabilities[
            class_name
        ]

        if not isinstance(
            value,
            (int, float),
        ):
            fail(
                f"{class_name} probability "
                "is not numeric"
            )

        if value < 0 or value > 1:
            fail(
                f"{class_name} probability "
                "is outside 0..1"
            )

    probability_sum = sum(
        probabilities.values()
    )

    print(
        f"\nProbability sum: "
        f"{probability_sum:.6f}"
    )

    if abs(
        probability_sum - 1.0
    ) > 0.00001:
        fail(
            "probabilities do not sum to 1"
        )

    selected_probability = signal.get(
        "probability"
    )

    if not isinstance(
        selected_probability,
        (int, float),
    ):
        fail(
            "selected probability "
            "is not numeric"
        )

    expected_probability = probabilities[
        prediction
    ]

    if abs(
        selected_probability
        - expected_probability
    ) > 0.00001:
        fail(
            "selected probability does "
            "not match prediction probability"
        )

    if signal.get(
        "model"
    ) != "random-forest-calibrated":
        fail(
            "model is not "
            "random-forest-calibrated"
        )

    if signal.get(
        "calibration"
    ) != "sigmoid":
        fail(
            "calibration is not sigmoid"
        )

    if signal.get(
        "horizonCandles"
    ) != 6:
        fail(
            "horizonCandles is not 6"
        )

    if not signal.get(
        "timestamp"
    ):
        fail(
            "signal timestamp is missing"
        )

    print("\nVALIDATION RESULTS")
    print("-" * 70)

    print(
        "PASS - HTTP response"
    )

    print(
        "PASS - success flag"
    )

    print(
        "PASS - python ML source"
    )

    print(
        "PASS - asset metadata"
    )

    print(
        "PASS - prediction class"
    )

    print(
        "PASS - probability classes"
    )

    print(
        "PASS - probability ranges"
    )

    print(
        "PASS - probability sum"
    )

    print(
        "PASS - selected probability"
    )

    print(
        "PASS - calibrated model"
    )

    print(
        "PASS - sigmoid calibration"
    )

    print(
        "PASS - prediction horizon"
    )

    print(
        "PASS - prediction timestamp"
    )

    print("\nFINAL SIGNAL")
    print("-" * 70)

    print(
        f"Prediction : {prediction}"
    )

    print(
        f"DOWN       : "
        f"{probabilities['DOWN']:.6f}"
    )

    print(
        f"NEUTRAL    : "
        f"{probabilities['NEUTRAL']:.6f}"
    )

    print(
        f"UP         : "
        f"{probabilities['UP']:.6f}"
    )

    print(
        f"Selected   : "
        f"{selected_probability:.6f}"
    )

    print(
        f"Model      : "
        f"{signal['model']}"
    )

    print(
        f"Calibration: "
        f"{signal['calibration']}"
    )

    print("\nRESULT_JSON=")

    print(
        {
            "success": True,
            "test": (
                "prediction-contract"
            ),
            "source": (
                "python-ml-service"
            ),
            "model": (
                "random-forest-calibrated"
            ),
            "calibration": "sigmoid",
            "prediction": prediction,
            "probabilitySum": probability_sum,
        }
    )

    print(
        "\nV4.9.5 END-TO-END "
        "PREDICTION CONTRACT PASS"
    )


if __name__ == "__main__":
    main()
