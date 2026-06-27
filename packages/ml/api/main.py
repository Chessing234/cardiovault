"""Lightweight CardioVault ML inference API for Render (circuit-aligned risk model)."""

from __future__ import annotations

from flask import Flask, jsonify, request

app = Flask(__name__)


def compute_risk(vitals: dict) -> tuple[int, float]:
    age = int(vitals.get("age", 45))
    systolic_bp = int(vitals.get("systolicBP", 120))
    cholesterol = int(vitals.get("cholesterol", 200))
    hdl = int(vitals.get("hdl", 50))
    ldl = int(vitals.get("ldl", 130))
    bmi = int(vitals.get("bmi", 240))
    is_smoker = int(vitals.get("isSmoker", 0))
    is_diabetic = int(vitals.get("isDiabetic", 0))
    has_family_history = int(vitals.get("hasFamilyHistory", 0))

    risk_lin = (
        age * 2
        + systolic_bp * 3
        + cholesterol
        + ldl
        + bmi * 2
        + is_smoker * 500
        + is_diabetic * 300
        + has_family_history * 200
    )
    risk = risk_lin - hdl * 2
    risk_score_int = risk // 100
    risk_percent = round(risk / 100, 1)
    return risk_score_int, risk_percent


@app.get("/health")
def health():
    return jsonify({"status": "ok", "service": "cardiovault-ml"})


@app.post("/api/ml/predict")
def predict():
    vitals = request.get_json(silent=True) or {}
    risk_score_int, risk_percent = compute_risk(vitals)
    return jsonify(
        {
            "modelVersion": "framingham-zk-v1",
            "riskScoreInt": risk_score_int,
            "riskPercent": risk_percent,
            "vitals": vitals,
        }
    )
