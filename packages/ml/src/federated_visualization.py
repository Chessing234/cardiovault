"""
Visualization helpers for the federated learning **simulation**.

Figures default to headless-friendly behavior: when ``show=False`` (default), figures are
closed after saving to avoid requiring a GUI backend in CI / cloud notebooks.
"""

from __future__ import annotations

import os
from typing import Dict, Optional, Sequence

import matplotlib

matplotlib.use(os.environ.get("MATPLOTLIB_BACKEND", "Agg"))

import matplotlib.pyplot as plt
import numpy as np


def _maybe_show(show: bool) -> None:
    if show:
        plt.show()
    else:
        plt.close()


def plot_federated_training_history(
    round_history: Sequence[dict],
    *,
    save_path: Optional[str] = None,
    show: bool = False,
) -> None:
    """Plot global accuracy / ROC-AUC vs federated round (requires ``global_eval`` in history)."""
    rounds = [int(r["round"]) for r in round_history]
    accs = [float(r.get("global_eval", {}).get("accuracy", 0.0)) for r in round_history]
    aucs = [float(r.get("global_eval", {}).get("roc_auc", r.get("global_eval", {}).get("auc", 0.5))) for r in round_history]

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))

    ax1.plot(rounds, accs, "o-", color="#DC2626", linewidth=2, markersize=6)
    ax1.set_xlabel("Federated round", fontsize=12)
    ax1.set_ylabel("Accuracy", fontsize=12)
    ax1.set_title("Global model accuracy", fontsize=14)
    ax1.grid(True, alpha=0.3)
    ax1.set_ylim(0.45, 1.0)

    ax2.plot(rounds, aucs, "o-", color="#1E40AF", linewidth=2, markersize=6)
    ax2.set_xlabel("Federated round", fontsize=12)
    ax2.set_ylabel("ROC-AUC", fontsize=12)
    ax2.set_title("Global model discrimination", fontsize=14)
    ax2.grid(True, alpha=0.3)
    ax2.set_ylim(0.45, 1.0)

    plt.tight_layout()
    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches="tight")
    _maybe_show(show)


def plot_client_contributions(
    participation_stats: Dict[str, int],
    *,
    save_path: Optional[str] = None,
    show: bool = False,
) -> None:
    clients = list(participation_stats.keys())
    counts = list(participation_stats.values())

    plt.figure(figsize=(10, 6))
    colors = ["#DC2626", "#1E40AF", "#14B8A6", "#F59E0B", "#8B5CF6", "#10B981"]
    bars = plt.bar(clients, counts, color=colors[: len(clients)], edgecolor="white", linewidth=0.5)

    plt.xlabel("Hospital (client)", fontsize=12)
    plt.ylabel("Participation rounds", fontsize=12)
    plt.title("Client participation across FL rounds", fontsize=14)
    plt.xticks(rotation=25, ha="right")

    for bar in bars:
        h = float(bar.get_height())
        plt.text(float(bar.get_x() + bar.get_width() / 2.0), h, f"{int(h)}", ha="center", va="bottom", fontsize=10)

    plt.tight_layout()
    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches="tight")
    _maybe_show(show)


def plot_client_data_distribution(
    client_data_sizes: Sequence[int],
    client_names: Sequence[str],
    *,
    save_path: Optional[str] = None,
    show: bool = False,
) -> None:
    sizes = [int(x) for x in client_data_sizes]
    names = [str(x) for x in client_names]

    plt.figure(figsize=(8, 8))
    colors = ["#DC2626", "#1E40AF", "#14B8A6", "#F59E0B", "#8B5CF6", "#10B981"]

    total = float(sum(sizes))

    def autopct(pct: float) -> str:
        val = int(round(pct * total / 100.0))
        return f"{pct:.1f}%\n({val} samples)"

    plt.pie(
        sizes,
        labels=names,
        colors=colors[: len(names)],
        autopct=autopct,
        startangle=90,
        wedgeprops=dict(edgecolor="white", linewidth=2),
    )
    plt.title("Local patient shard sizes (simulated hospitals)", fontsize=14)
    plt.axis("equal")
    plt.tight_layout()
    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches="tight")
    _maybe_show(show)


def plot_privacy_comparison(
    federated_metrics: Dict[str, float],
    centralized_metrics: Dict[str, float],
    *,
    save_path: Optional[str] = None,
    show: bool = False,
) -> None:
    metrics = ["Accuracy", "Precision", "Recall", "ROC-AUC"]
    keys = ["accuracy", "precision", "recall", "roc_auc"]
    fed_values = [float(federated_metrics.get(k, 0.0)) for k in keys]
    cent_values = [float(centralized_metrics.get(k, 0.0)) for k in keys]

    x = np.arange(len(metrics))
    width = 0.35

    fig, ax = plt.subplots(figsize=(10, 6))
    ax.bar(x - width / 2, fed_values, width, label="Federated (FedAvg)", color="#14B8A6", edgecolor="white")
    ax.bar(x + width / 2, cent_values, width, label="Centralized (full data)", color="#DC2626", edgecolor="white")

    ax.set_xlabel("Metric", fontsize=12)
    ax.set_ylabel("Score", fontsize=12)
    ax.set_title("Similar performance without centralizing raw patient rows", fontsize=14)
    ax.set_xticks(x)
    ax.set_xticklabels(metrics)
    ax.legend(fontsize=11)
    ax.set_ylim(0.0, 1.05)
    ax.grid(axis="y", alpha=0.3)

    for i, (fv, cv) in enumerate(zip(fed_values, cent_values, strict=True)):
        ax.text(i - width / 2, fv + 0.01, f"{fv:.3f}", ha="center", va="bottom", fontsize=9)
        ax.text(i + width / 2, cv + 0.01, f"{cv:.3f}", ha="center", va="bottom", fontsize=9)

    plt.tight_layout()
    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches="tight")
    _maybe_show(show)
