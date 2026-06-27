"""Lightweight CardioVault ML inference API for Render (circuit-aligned risk model)."""

from __future__ import annotations

from typing import Literal

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="CardioVault ML API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class Vitals(BaseModel):
    age: int = Field(ge=18, le=120)
    systolicBP: int = Field(ge=70, le=250)
    diastolicBP: int = Field(default=80, ge=40, le=150)
    cholesterol: int = Field(default=200, ge=100, le=600)
    hdl: int = Field(default=50, ge=10, le=200)
    ldl: int = Field(default=130, ge=20, le=400)
    bmi: int = Field(default=240, ge=100, le=601, description="BMI × 10")
    isSmoker: Literal[0, 1] = 0
    isDiabetic: Literal[0, 1] = 0
    hasFamilyHistory: Literal[0, 1] = 0


def compute_risk(v: Vitals) -> tuple[int, float]:
    risk_lin = (
        v.age * 2
        + v.systolicBP * 3
        + v.cholesterol
        + v.ldl
        + v.bmi * 2
        + v.isSmoker * 500
        + v.isDiabetic * 300
        + v.hasFamilyHistory * 200
    )
    risk = risk_lin - v.hdl * 2
    risk_score_int = risk // 100
    risk_percent = round(risk / 100, 1)
    return risk_score_int, risk_percent


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "cardiovault-ml"}


@app.post("/api/ml/predict")
def predict(vitals: Vitals) -> dict[str, object]:
    risk_score_int, risk_percent = compute_risk(vitals)
    return {
        "modelVersion": "framingham-zk-v1",
        "riskScoreInt": risk_score_int,
        "riskPercent": risk_percent,
        "vitals": vitals.model_dump(),
    }
