"""
Evaluation utilities: ROC/PR curves, calibration, confusion matrices, and SHAP summaries.

All plotting helpers accept ``show=False`` so they behave well in CI / Kaggle kernels
without an interactive backend (figures are still saved when ``save_path`` is set).
"""

from __future__ import annotations

import logging
import os
from typing import Any, Dict, List, Optional, Sequence

import matplotlib

matplotlib.use(os.environ.get("MATPLOTLIB_BACKEND", "Agg"))

import matplotlib.pyplot as plt
import numpy as np
from sklearn.calibration import calibration_curve
from sklearn.metrics import (
    average_precision_score,
    classification_report,
    precision_recall_curve,
    roc_auc_score,
    roc_curve,
)

logger = logging.getLogger(__name__)


def _maybe_show_and_close(show: bool) -> None:
    if show:
        plt.show()
    else:
        plt.close()


def plot_roc_curve(
    y_true: np.ndarray,
    y_proba: np.ndarray,
    save_path: Optional[str] = None,
    *,
    show: bool = False,
) -> float:
    """Plot ROC curve; returns ROC-AUC."""
    fpr, tpr, _ = roc_curve(y_true, y_proba)
    auc = float(roc_auc_score(y_true, y_proba)) if len(np.unique(y_true)) > 1 else 0.5

    plt.figure(figsize=(8, 6))
    plt.plot(fpr, tpr, color="#DC2626", linewidth=2, label=f"ROC (AUC = {auc:.3f})")
    plt.plot([0, 1], [0, 1], "k--", linewidth=1, label="Chance")
    plt.xlabel("False positive rate", fontsize=12)
    plt.ylabel("True positive rate", fontsize=12)
    plt.title("ROC curve — Cardiovascular risk", fontsize=14)
    plt.legend(loc="lower right")
    plt.grid(True, alpha=0.25)

    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches="tight")
        logger.info("Saved ROC curve to %s", save_path)
    _maybe_show_and_close(show)
    return auc


def plot_precision_recall(
    y_true: np.ndarray,
    y_proba: np.ndarray,
    save_path: Optional[str] = None,
    *,
    show: bool = False,
) -> float:
    """Plot precision–recall curve; returns average precision."""
    precision, recall, _ = precision_recall_curve(y_true, y_proba)
    ap = float(average_precision_score(y_true, y_proba))

    plt.figure(figsize=(8, 6))
    plt.plot(recall, precision, color="#1E40AF", linewidth=2, label=f"PR (AP = {ap:.3f})")
    plt.xlabel("Recall", fontsize=12)
    plt.ylabel("Precision", fontsize=12)
    plt.title("Precision–recall curve", fontsize=14)
    plt.grid(True, alpha=0.25)
    plt.legend(loc="lower left")

    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches="tight")
    _maybe_show_and_close(show)
    return ap


def plot_calibration(
    y_true: np.ndarray,
    y_proba: np.ndarray,
    save_path: Optional[str] = None,
    *,
    n_bins: int = 8,
    show: bool = False,
) -> None:
    """Reliability diagram (fraction of positives vs mean predicted probability)."""
    prob_true, prob_pred = calibration_curve(y_true, y_proba, n_bins=n_bins, strategy="uniform")
    plt.figure(figsize=(7, 6))
    plt.plot(prob_pred, prob_true, marker="o", color="#14B8A6", label="Model")
    plt.plot([0, 1], [0, 1], "k--", label="Perfectly calibrated")
    plt.xlabel("Mean predicted probability", fontsize=12)
    plt.ylabel("Fraction of positives", fontsize=12)
    plt.title("Calibration (histogram binning)", fontsize=14)
    plt.grid(True, alpha=0.25)
    plt.legend()

    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches="tight")
    _maybe_show_and_close(show)


def plot_feature_importance(
    feature_names: Sequence[str],
    importances: np.ndarray,
    top_n: int = 15,
    save_path: Optional[str] = None,
    *,
    show: bool = False,
) -> None:
    """Horizontal bar chart of ``top_n`` features by importance."""
    importances = np.asarray(importances, dtype=float)
    indices = np.argsort(importances)[::-1][:top_n]

    plt.figure(figsize=(10, 8))
    plt.barh(np.arange(top_n), importances[indices], align="center", color="#DC2626")
    plt.yticks(np.arange(top_n), [feature_names[i] for i in indices])
    plt.xlabel("Feature importance", fontsize=12)
    plt.title(f"Top {top_n} features", fontsize=14)
    plt.gca().invert_yaxis()
    plt.tight_layout()

    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches="tight")
    _maybe_show_and_close(show)


def plot_confusion_matrix(cm: np.ndarray, save_path: Optional[str] = None, *, show: bool = False) -> None:
    """Render confusion matrix counts as a heatmap."""
    cm = np.asarray(cm)
    plt.figure(figsize=(6, 5))
    plt.imshow(cm, interpolation="nearest", cmap=plt.cm.Reds)
    plt.title("Confusion matrix", fontsize=14)
    plt.colorbar()

    classes = ["No event", "Event"]
    tick_marks = np.arange(len(classes))
    plt.xticks(tick_marks, classes)
    plt.yticks(tick_marks, classes)

    thresh = cm.max() / 2.0 if cm.size else 0
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            plt.text(
                j,
                i,
                format(cm[i, j], "d"),
                ha="center",
                va="center",
                color="white" if cm[i, j] > thresh else "black",
                fontsize=14,
            )

    plt.ylabel("True label", fontsize=12)
    plt.xlabel("Predicted label", fontsize=12)
    plt.tight_layout()

    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches="tight")
    _maybe_show_and_close(show)


def plot_shap_summary(
    model: Any,
    X_background: np.ndarray,
    X_explain: np.ndarray,
    feature_names: List[str],
    save_path: Optional[str] = None,
    *,
    max_samples: int = 200,
    show: bool = False,
) -> None:
    """SHAP summary for tree models (RandomForest / GradientBoosting).

    Falls back to ``KernelExplainer`` (slower) if the model is not tree-based.
    """
    import shap  # heavy import — only when needed

    rng = np.random.default_rng(42)
    bg = X_background
    if len(bg) > max_samples:
        idx = rng.choice(len(bg), size=max_samples, replace=False)
        bg = bg[idx]
    ex = X_explain
    if len(ex) > max_samples:
        idx = rng.choice(len(ex), size=max_samples, replace=False)
        ex = ex[idx]

    explainer: Any
    try:
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(ex)
        if isinstance(shap_values, list):  # binary classification list [neg, pos]
            shap_values = shap_values[1]
    except Exception as exc:  # pragma: no cover - defensive
        logger.warning("TreeExplainer failed (%s); using KernelExplainer (slow).", exc)
        explainer = shap.KernelExplainer(model.predict_proba, bg)
        shap_values = explainer.shap_values(ex, nsamples=min(200, len(bg) * len(ex)))

    if isinstance(shap_values, list) and len(shap_values) > 1:
        shap_values = shap_values[1]

    shap.summary_plot(
        shap_values,
        ex,
        feature_names=feature_names,
        show=False,
        plot_size=(10, 8),
    )
    plt.title("SHAP summary (impact on model output)", fontsize=14)
    plt.tight_layout()

    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches="tight")
    _maybe_show_and_close(show)


def generate_evaluation_report(
    y_true: np.ndarray,
    y_proba: np.ndarray,
    y_pred: np.ndarray,
    *,
    feature_names: Optional[Sequence[str]] = None,
    feature_importance: Optional[np.ndarray] = None,
) -> Dict[str, Any]:
    """Structured report dict (metrics + sklearn classification report)."""
    auc = float(roc_auc_score(y_true, y_proba)) if len(np.unique(y_true)) > 1 else 0.5
    report: Dict[str, Any] = {
        "classification_report": classification_report(
            y_true,
            y_pred,
            target_names=["No event", "Event"],
            output_dict=True,
            zero_division=0,
        ),
        "roc_auc": auc,
        "average_precision": float(average_precision_score(y_true, y_proba)),
        "feature_names": list(feature_names) if feature_names is not None else None,
        "feature_importance": feature_importance.tolist() if feature_importance is not None else None,
    }
    return report


def evaluate_model(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    """Lightweight compatibility wrapper used elsewhere in the monorepo."""
    from sklearn.metrics import accuracy_score, f1_score, roc_auc_score

    y_true = np.asarray(y_true)
    y_pred = np.asarray(y_pred)
    return {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "f1": float(f1_score(y_true, y_pred, zero_division=0)),
        # If hard labels only, ROC AUC is not well-defined — caller should pass probabilities instead.
        "roc_auc": float(roc_auc_score(y_true, y_pred)) if len(np.unique(y_true)) > 1 else 0.5,
    }
