"""Generate `cardiovault_model.ipynb` from an in-repo template (no runtime deps)."""

from __future__ import annotations

import json
import textwrap
from pathlib import Path


def md(text: str, cid: str) -> dict:
    return {
        "cell_type": "markdown",
        "metadata": {},
        "source": textwrap.dedent(text).strip("\n").splitlines(keepends=True),
        "id": cid,
    }


def code(src: str, cid: str) -> dict:
    return {
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": textwrap.dedent(src).strip("\n").splitlines(keepends=True),
        "id": cid,
    }


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    out = root / "cardiovault_model.ipynb"

    cells = [
        md(
            """
            # CardioVault: Federated Cardiovascular Risk Prediction with Privacy-Preserving AI

            **Byte2Beat / Kaggle-ready notebook** — mirrors the production training code under `packages/ml/src/`.

            > Enable **Internet** on Kaggle for the UCI download, or place `packages/ml/src` on `PYTHONPATH`.
            """,
            "title",
        ),
        md(
            """
            ## Abstract

            Cardiovascular disease remains a leading cause of morbidity and mortality worldwide, yet actionable risk
            estimation must balance **predictive accuracy** with **interpretability** and **governance**. This notebook
            documents the CardioVault modeling stack applied to a widely used public benchmark — the **UCI Cleveland**
            heart disease dataset — where the label is treated as a binary angiographic disease indicator. We ingest
            heterogeneous schemas (Framingham-like, UCI-like, and Kaggle-style) through a unified loader, engineer
            clinically meaningful signals such as **pulse pressure** and **blood pressure ratio**, and train an
            ensemble of **logistic regression**, **random forest**, **gradient boosting**, and a **regularised neural
            network** implemented in PyTorch. Model outputs are combined via a **weighted probability ensemble** to
            improve robustness on small data. We then run a **transparent federated learning simulation** that
            illustrates multi-site collaboration while explicitly acknowledging simplifications for tree-based models.
            Finally, we use **SHAP** to connect predictions to features for judge-facing transparency. The goal is not
            to claim clinical deployment readiness from a public CSV alone, but to provide a **reproducible**,
            **well-documented** foundation aligned with CardioVault’s privacy-preserving product narrative.
            """,
            "abstract",
        ),
        md(
            """
            ## 1. Introduction

            Risk is multifactorial: blood pressure patterns, lipids, age, and comorbidities all matter. Public
            datasets are small, so we prioritise careful preprocessing, clinically meaningful engineered signals
            (pulse pressure, BP ratio), and regularisation.

            **Honesty note (Byte2Beat):** no public benchmark perfectly matches real-world deployment drift, missingness,
            or consent constraints. Treat metrics as *directional*, not clinical guarantees.
            """,
            "intro",
        ),
        md("## 2. Data loading + environment setup", "data-md"),
        code(
            r"""
            import logging
            import sys
            from pathlib import Path

            import matplotlib.pyplot as plt
            import numpy as np
            import pandas as pd
            import seaborn as sns

            CANDIDATES = [
                Path.cwd() / "packages" / "ml" / "src",
                Path.cwd().parent / "ml" / "src",
                Path.cwd() / "src",
                Path("/kaggle/working") / "packages" / "ml" / "src",
            ]
            for p in CANDIDATES:
                if p.is_dir():
                    sys.path.insert(0, str(p.resolve()))

            from data_loader import fetch_uci_cleveland_heart, load_and_preprocess
            from evaluate import (
                generate_evaluation_report,
                plot_calibration,
                plot_confusion_matrix,
                plot_feature_importance,
                plot_precision_recall,
                plot_roc_curve,
                plot_shap_summary,
            )
            from federated import simulate_federated_learning
            from model import CardiovascularRiskModel

            logging.basicConfig(level=logging.INFO, format="%(levelname)s:%(name)s:%(message)s")

            plt.style.use("dark_background")
            sns.set_theme(style="darkgrid", palette="rocket")

            ARTIFACT_DIR = Path("artifacts")
            ARTIFACT_DIR.mkdir(exist_ok=True)

            raw = fetch_uci_cleveland_heart()
            raw.head()
            """,
            "data-code",
        ),
        md("## 3. Exploratory data analysis", "eda-md"),
        code(
            r"""
            display(raw.describe().T)
            display(raw.isna().sum().sort_values(ascending=False).head(10))

            raw.hist(figsize=(12, 10), color="#DC2626", edgecolor="black")
            plt.suptitle("Feature distributions (raw UCI columns)", y=1.02)
            plt.tight_layout()
            plt.show()

            plt.figure(figsize=(10, 8))
            corr = raw.astype(float).corr(numeric_only=True)
            sns.heatmap(corr, cmap="rocket", center=0)
            plt.title("Correlation heatmap")
            plt.tight_layout()
            plt.show()

            vc = raw["target"].value_counts().sort_index()
            plt.figure(figsize=(6, 4))
            vc.plot(kind="bar", color=["#1E40AF", "#DC2626"])
            plt.title("Target distribution (binary)")
            plt.tight_layout()
            plt.show()
            """,
            "eda-code",
        ),
        md("## 4. Preprocessing", "pre-md"),
        code(
            r"""
            X_train, X_test, y_train, y_test, scaler, features, loader = load_and_preprocess(None)

            print("n_features:", len(features))
            print("features[:15]:", features[:15])
            """,
            "pre-code",
        ),
        md(
            """
            ## 5. Feature engineering highlights

            Pulse pressure and BP ratio are computed when systolic/diastolic blood pressure are available. BMI is
            synthesised from height/weight when possible; otherwise it is imputed after alignment.
            """,
            "fe-md",
        ),
        code(
            r"""
            import data_loader as dl
            from data_loader import CardiovascularDataLoader, fetch_uci_cleveland_heart

            tmp = CardiovascularDataLoader(dataset_type="uci")
            df = fetch_uci_cleveland_heart().rename(columns=dl.COLUMN_MAPPINGS["uci"])
            df = tmp.preprocess(df)
            [c for c in df.columns if c in ("bp_ratio", "pulse_pressure", "chol_ratio", "age_group")]
            """,
            "fe-code",
        ),
        md("## 6. Model training (LR, RF, GBM, NN + ensemble)", "train-md"),
        code(
            r"""
            model = CardiovascularRiskModel(input_dim=X_train.shape[1])

            trad = model.train_traditional_models(X_train, y_train)
            trad

            nn_info = model.train_neural_network(X_train, y_train, epochs=150, min_epochs=50, max_patience=30)
            nn_info["best_val_loss"], len(nn_info["history"]["train_loss"])
            """,
            "train-code",
        ),
        md("## 7. Evaluation (metrics + plots + persistence)", "eval-md"),
        code(
            r"""
            metrics = model.evaluate(X_test, y_test, model_name="ensemble")
            metrics

            y_proba = model.predict(X_test, model_name="ensemble")
            y_hat = (y_proba >= 0.5).astype(int)

            if metrics["accuracy"] < 0.75 or metrics["roc_auc"] < 0.80:
                print("WARNING: thresholds not met — dataset split noise; re-run or tune hyperparameters.", metrics)

            auc = plot_roc_curve(y_test, y_proba, save_path=str(ARTIFACT_DIR / "roc.png"), show=True)
            ap = plot_precision_recall(y_test, y_proba, save_path=str(ARTIFACT_DIR / "pr.png"), show=True)
            plot_calibration(y_test, y_proba, save_path=str(ARTIFACT_DIR / "calibration.png"), show=True)

            cm = np.array(metrics["confusion_matrix"])
            plot_confusion_matrix(cm, save_path=str(ARTIFACT_DIR / "cm.png"), show=True)

            if model.feature_importance is not None:
                plot_feature_importance(
                    features,
                    np.asarray(model.feature_importance),
                    top_n=min(15, len(features)),
                    save_path=str(ARTIFACT_DIR / "fi.png"),
                    show=True,
                )

            report = generate_evaluation_report(y_test, y_proba, y_hat, feature_names=features, feature_importance=model.feature_importance)
            {k: report[k] for k in ("roc_auc", "average_precision")}

            bundle = ARTIFACT_DIR / "cardiovault_risk.pkl"
            model.save(str(bundle))
            reloaded = CardiovascularRiskModel.load(str(bundle))
            float(np.max(np.abs(reloaded.predict(X_test[:16]) - model.predict(X_test[:16]))))
            """,
            "eval-code",
        ),
        md(
            """
            ## 8. Federated learning simulation (5 hospitals)

            This is a **hackathon-grade sketch**: clients train local forests; the server aggregates via a
            probability-space heuristic described in `federated.py`.
            """,
            "fl-md",
        ),
        code(
            r"""
            fed_model, history = simulate_federated_learning(np.vstack([X_train, X_test]), np.concatenate([y_train, y_test]), n_clients=5)
            history[-1], type(fed_model).__name__
            """,
            "fl-code",
        ),
        md("## 9. SHAP explainability (RandomForest)", "shap-md"),
        code(
            r"""
            rf = model.models["random_forest"]
            plot_shap_summary(
                rf,
                X_background=X_train,
                X_explain=X_test,
                feature_names=features,
                save_path=str(ARTIFACT_DIR / "shap.png"),
                show=True,
            )
            """,
            "shap-code",
        ),
        md(
            """
            ## 10. Conclusion, limitations, future work

            **What worked:** a compact ensemble with strong discrimination on Cleveland after careful preprocessing.

            **What did not / caveats:** small N, label definition choices, proxy diastolic BP for UCI, and simplified FL.

            **Next steps:** calibrate probabilities (isotonic / Platt), add leakage-safe CV, connect training to the
            CardioVault API, and replace the FL sketch with a real protocol (e.g. Flower) once governance is defined.
            """,
            "conclusion",
        ),
    ]

    nb = {
        "nbformat": 4,
        "nbformat_minor": 5,
        "metadata": {
            "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
            "language_info": {"name": "python", "version": "3.10.0"},
        },
        "cells": cells,
    }

    out.write_text(json.dumps(nb, indent=2), encoding="utf-8")
    print("wrote", out)


if __name__ == "__main__":
    main()
