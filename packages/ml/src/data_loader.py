"""
Cardiovascular data loader for multiple public datasets.

Supports Framingham-style CSVs, UCI Heart Disease (Cleveland), and the classic
Kaggle-style cardiovascular dataset (``ap_hi`` / ``ap_lo`` schema).

Clinical notes (why these engineered features exist)
-----------------------------------------------------
* **Pulse pressure** (systolic − diastolic): widened pulse pressure is associated
  with arterial stiffness and adverse cardiovascular outcomes.
* **BP ratio** (systolic / diastolic): captures hypertension patterns beyond
  isolated systolic or diastolic elevation.
* **BMI**: adiposity is a modifiable risk factor commonly used in risk scores.
"""

from __future__ import annotations

import logging
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler

logger = logging.getLogger(__name__)

# Standard column mapping for common datasets
COLUMN_MAPPINGS: Dict[str, Dict[str, str]] = {
    "framingham": {
        "male": "gender",
        "age": "age",
        "education": "education",
        "currentSmoker": "smoking",
        "cigsPerDay": "cigarettes_per_day",
        "BPMeds": "bp_medication",
        "prevalentStroke": "stroke_history",
        "prevalentHyp": "hypertension",
        "diabetes": "diabetes",
        "totChol": "cholesterol",
        "sysBP": "systolic_bp",
        "diaBP": "diastolic_bp",
        "BMI": "bmi",
        "heartRate": "heart_rate",
        "glucose": "glucose",
        "TenYearCHD": "target",
    },
    "uci": {
        "age": "age",
        "sex": "gender",
        "cp": "chest_pain_type",
        "trestbps": "systolic_bp",
        "chol": "cholesterol",
        "fbs": "fasting_blood_sugar",
        "restecg": "rest_ecg",
        "thalach": "max_heart_rate",
        "exang": "exercise_angina",
        "oldpeak": "st_depression",
        "slope": "st_slope",
        "ca": "num_major_vessels",
        "thal": "thalassemia",
        "target": "target",
    },
    "kaggle_cardio": {
        "age": "age",
        "gender": "gender",
        "height": "height",
        "weight": "weight",
        "ap_hi": "systolic_bp",
        "ap_lo": "diastolic_bp",
        "cholesterol": "cholesterol",
        "gluc": "glucose",
        "smoke": "smoking",
        "alco": "alcohol",
        "active": "physical_activity",
        "cardio": "target",
    },
}

REQUIRED_COLUMNS = [
    "age",
    "gender",
    "systolic_bp",
    "diastolic_bp",
    "cholesterol",
    "bmi",
    "smoking",
    "diabetes",
    "target",
]

OPTIONAL_COLUMNS = [
    "height",
    "weight",
    "hdl",
    "ldl",
    "glucose",
    "heart_rate",
    "physical_activity",
    "alcohol",
    "family_history",
    "hypertension",
    "chest_pain_type",
    "max_heart_rate",
    "education",
    "cigarettes_per_day",
    "bp_medication",
    "stroke_history",
    "fasting_blood_sugar",
    "rest_ecg",
    "exercise_angina",
    "st_depression",
    "st_slope",
    "num_major_vessels",
    "thalassemia",
    "age_group",
]

UCI_CLEVELAND_URL = (
    "https://archive.ics.uci.edu/ml/machine-learning-databases/"
    "heart-disease/processed.cleveland.data"
)


def fetch_uci_cleveland_heart() -> pd.DataFrame:
    """Download the UCI Cleveland heart disease dataset (public, no auth).

    The raw file has no header and uses ``?`` for missing values.
    ``target`` is converted to binary: any degree of angiographic disease (>0)
    is treated as positive, matching common practice for this benchmark.
    """
    cols = [
        "age",
        "sex",
        "cp",
        "trestbps",
        "chol",
        "fbs",
        "restecg",
        "thalach",
        "exang",
        "oldpeak",
        "slope",
        "ca",
        "thal",
        "target",
    ]
    df = pd.read_csv(UCI_CLEVELAND_URL, header=None, names=cols, na_values="?")
    df = df.dropna()
    df["target"] = (df["target"] > 0).astype(int)
    logger.info("Fetched UCI Cleveland heart disease: %s rows", len(df))
    return df


class CardiovascularDataLoader:
    """Unified loader + preprocessing for cardiovascular tabular data."""

    def __init__(self, dataset_type: str = "auto", random_state: int = 42) -> None:
        self.dataset_type = dataset_type
        self.random_state = random_state
        self.scaler = StandardScaler()
        self.label_encoders: Dict[str, LabelEncoder] = {}
        self.feature_columns: List[str] = []
        self.target_column = "target"

    def load_csv(self, filepath: str) -> pd.DataFrame:
        """Load a CSV and standardize column names to the CardioVault schema."""
        df = pd.read_csv(filepath)
        logger.info("Loaded %s rows, %s columns from %s", len(df), len(df.columns), filepath)

        if self.dataset_type == "auto":
            self.dataset_type = self._detect_dataset_type(df)

        if self.dataset_type in COLUMN_MAPPINGS:
            df = df.rename(columns=COLUMN_MAPPINGS[self.dataset_type])

        return df

    def _detect_dataset_type(self, df: pd.DataFrame) -> str:
        """Infer dataset family from column names."""
        cols = {c.lower() for c in df.columns}
        if "tenyearchd" in cols or "cigsperday" in cols or "totchol" in cols:
            return "framingham"
        if "thalach" in cols or "oldpeak" in cols or "trestbps" in cols:
            return "uci"
        if "ap_hi" in cols or "ap_lo" in cols:
            return "kaggle_cardio"
        return "generic"

    def _ensure_core_schema(self, df: pd.DataFrame) -> pd.DataFrame:
        """Align heterogeneous public datasets to the minimum CardioVault feature set."""
        df = df.copy()

        # UCI does not ship smoking/diabetes/BMI/diastolic explicitly — conservative defaults.
        if "diastolic_bp" not in df.columns and "systolic_bp" in df.columns:
            # Rough resting diastolic proxy when only systolic is available (demo / legacy rows).
            df["diastolic_bp"] = (df["systolic_bp"] * 0.65).clip(lower=40, upper=120)

        if "bmi" not in df.columns:
            if {"height", "weight"}.issubset(df.columns):
                df["bmi"] = df["weight"] / ((df["height"] / 100.0) ** 2)
            else:
                df["bmi"] = np.nan

        if bool(df["bmi"].isna().all()) if "bmi" in df.columns else True:
            df["bmi"] = 26.0
        else:
            df["bmi"] = df["bmi"].fillna(float(df["bmi"].median()))

        if "smoking" not in df.columns:
            df["smoking"] = 0
        if "diabetes" not in df.columns:
            df["diabetes"] = 0

        return df

    def preprocess(self, df: pd.DataFrame, target_col: str = "target") -> pd.DataFrame:
        """Clean rows, impute numerics, winsorize vitals, and add engineered features."""
        df = df.copy()
        df = self._ensure_core_schema(df)

        initial_len = len(df)
        df = df.drop_duplicates()
        logger.info("Removed %s duplicate rows", initial_len - len(df))

        if target_col not in df.columns:
            raise ValueError(f"Target column {target_col!r} not found after rename/schema alignment.")

        df = df.dropna(subset=[target_col])
        df[target_col] = df[target_col].astype(int)

        numeric_cols = df.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            missing = int(df[col].isna().sum())
            if missing > 0:
                median_val = float(df[col].median())
                df[col] = df[col].fillna(median_val)
                logger.info("Filled %s missing values in %s with median %s", missing, col, median_val)

        vital_cols = ["systolic_bp", "diastolic_bp", "cholesterol", "bmi"]
        for col in vital_cols:
            if col in df.columns:
                q1, q3 = df[col].quantile([0.025, 0.975])
                outliers = int(((df[col] < q1) | (df[col] > q3)).sum())
                df[col] = df[col].clip(q1, q3)
                if outliers > 0:
                    logger.info("Clipped %s outliers in %s (2.5–97.5%% winsor)", outliers, col)

        if "age" in df.columns:
            df["age_group"] = pd.cut(
                df["age"],
                bins=[0, 30, 40, 50, 60, 100],
                labels=["<30", "30-40", "40-50", "50-60", "60+"],
            )

        if "bmi" not in df.columns and {"height", "weight"}.issubset(df.columns):
            df["bmi"] = df["weight"] / ((df["height"] / 100.0) ** 2)

        if "systolic_bp" in df.columns and "diastolic_bp" in df.columns:
            df["bp_ratio"] = df["systolic_bp"] / (df["diastolic_bp"] + 1e-6)
            df["pulse_pressure"] = df["systolic_bp"] - df["diastolic_bp"]

        if "hdl" in df.columns and "ldl" in df.columns:
            df["chol_ratio"] = df["ldl"] / (df["hdl"] + 1e-6)
        elif "cholesterol" in df.columns and "hdl" in df.columns:
            df["chol_ratio"] = df["cholesterol"] / (df["hdl"] + 1e-6)

        df = df.replace([np.inf, -np.inf], np.nan)
        for col in df.select_dtypes(include=[np.number]).columns:
            if col == target_col:
                continue
            if df[col].isna().any():
                fill = float(np.nanmedian(df[col].to_numpy(dtype=float)))
                if not np.isfinite(fill):
                    fill = 0.0
                df[col] = df[col].fillna(fill)

        logger.info("Preprocessed data shape: %s", df.shape)
        return df

    def get_feature_target_split(self, df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray, List[str]]:
        """Split dataframe into ``X`` (numeric matrix) and ``y`` (binary target)."""
        ordered: List[str] = []
        seen: set[str] = set()
        for c in REQUIRED_COLUMNS + OPTIONAL_COLUMNS:
            if c in df.columns and c != self.target_column and c not in seen:
                ordered.append(c)
                seen.add(c)
        for extra in ("bp_ratio", "pulse_pressure", "chol_ratio"):
            if extra in df.columns and extra not in seen:
                ordered.append(extra)
                seen.add(extra)

        X = df[ordered].copy()
        y = df[self.target_column].copy()

        for col in X.select_dtypes(include=["object", "category"]).columns:
            le = LabelEncoder()
            X[col] = le.fit_transform(X[col].astype(str))
            self.label_encoders[col] = le

        self.feature_columns = ordered
        logger.info("Feature matrix shape: %s", X.shape)
        logger.info("Features: %s", ordered)
        return X.values.astype(np.float32), y.values.astype(np.int64), ordered

    def split_and_scale(
        self,
        X: np.ndarray,
        y: np.ndarray,
        test_size: float = 0.2,
        stratify: bool = True,
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, StandardScaler]:
        """Stratified train/test split + ``StandardScaler`` fit on the train fold."""
        strat = y if stratify and len(np.unique(y)) > 1 else None
        X_train, X_test, y_train, y_test = train_test_split(
            X,
            y,
            test_size=test_size,
            random_state=self.random_state,
            stratify=strat,
        )

        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        logger.info("Train set: %s, Test set: %s", X_train_scaled.shape, X_test_scaled.shape)

        return X_train_scaled, X_test_scaled, y_train, y_test, self.scaler


def load_and_preprocess(
    filepath: str | None,
    dataset_type: str = "auto",
    *,
    use_uci_default: bool | None = None,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, StandardScaler, List[str], "CardiovascularDataLoader"]:
    """Load CSV **or** fetch UCI Cleveland, preprocess, split, and scale.

    ``use_uci_default`` defaults to ``True`` when ``filepath`` is ``None``; otherwise defaults to
    ``False`` (load from ``filepath``).
    """
    use_uci = (filepath is None) if use_uci_default is None else use_uci_default

    loader = CardiovascularDataLoader(dataset_type=dataset_type)
    if use_uci:
        df = fetch_uci_cleveland_heart()
        loader.dataset_type = "uci"
        df = df.rename(columns=COLUMN_MAPPINGS["uci"])
    else:
        if not filepath:
            raise ValueError("filepath must be provided when use_uci_default is False")
        df = loader.load_csv(filepath)

    df = loader.preprocess(df)
    X, y, features = loader.get_feature_target_split(df)
    X_train, X_test, y_train, y_test, scaler = loader.split_and_scale(X, y)
    return X_train, X_test, y_train, y_test, scaler, features, loader
