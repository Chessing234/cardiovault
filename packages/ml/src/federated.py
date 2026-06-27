"""
Federated learning **simulation** for CardioVault (tree soft-vote sketch).

For a **PyTorch FedAvg** walk-through (hospital shards + weight averaging + plots),
see:

- ``federated_client.py`` / ``federated_server.py`` / ``federated_visualization.py``
- ``notebooks/federated_demo.ipynb``

This module keeps the earlier **RandomForest** + probability-space aggregation demo used
by ``simulate_federated_learning`` for backwards compatibility with the ML notebook.
"""

from __future__ import annotations

import copy
import logging
from dataclasses import dataclass
from typing import Any, Dict, List, Tuple

import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split

logger = logging.getLogger(__name__)


@dataclass
class ClientUpdate:
    client_id: str
    n_samples: int
    model: RandomForestClassifier


class FederatedClient:
    """A hospital / silo holding a shard of the training data."""

    def __init__(self, client_id: str, X_local: np.ndarray, y_local: np.ndarray) -> None:
        self.client_id = client_id
        self.X_local = np.asarray(X_local, dtype=np.float32)
        self.y_local = np.asarray(y_local, dtype=np.int64)
        self.local_model: RandomForestClassifier | None = None

    def local_train(self, global_template: RandomForestClassifier, epochs: int = 1) -> RandomForestClassifier:
        """Fit a fresh forest seeded from ``global_template`` hyper-parameters."""
        del epochs  # trees are not multi-epoch in this simulation; kept for API symmetry
        model = copy.deepcopy(global_template)
        model.fit(self.X_local, self.y_local)
        self.local_model = model
        return model

    def get_weights(self) -> np.ndarray | None:
        if self.local_model is not None and hasattr(self.local_model, "feature_importances_"):
            return self.local_model.feature_importances_
        return None


class FederatedServer:
    """Coordinates rounds and aggregates client models."""

    def __init__(self, global_template: RandomForestClassifier, X_val: np.ndarray, y_val: np.ndarray) -> None:
        self.global_template = global_template
        self.X_val = np.asarray(X_val, dtype=np.float32)
        self.y_val = np.asarray(y_val, dtype=np.int64)
        self.clients: List[FederatedClient] = []
        self.round_history: List[Dict[str, Any]] = []
        self.global_model: RandomForestClassifier = copy.deepcopy(global_template)

    def register_client(self, client: FederatedClient) -> None:
        self.clients.append(client)
        logger.info("Registered %s with %s samples", client.client_id, len(client.X_local))

    def _aggregate_soft_vote(self, updates: List[ClientUpdate]) -> RandomForestClassifier:
        """Weighted average of predicted probabilities on the server validation set."""
        if not updates:
            raise ValueError("No client updates to aggregate.")

        probs: List[np.ndarray] = []
        weights: List[float] = []
        for u in updates:
            p = u.model.predict_proba(self.X_val)[:, 1]
            probs.append(p)
            weights.append(float(u.n_samples))

        w = np.asarray(weights, dtype=np.float64)
        w = w / w.sum()
        stacked = np.stack(probs, axis=0)  # (n_clients, n_val)
        ensemble = np.average(stacked, axis=0, weights=w)

        # Choose the single client model closest to the ensemble (keeps a concrete sklearn object).
        dists = [float(np.mean((p - ensemble) ** 2)) for p in probs]
        best = int(np.argmin(dists))
        chosen = updates[best].model
        logger.info(
            "Aggregated soft votes from %s clients; selected client model index %s as global artifact",
            len(updates),
            best,
        )
        return chosen

    def federated_round(self, local_epochs: int = 1) -> Dict[str, Any]:
        updates: List[ClientUpdate] = []
        for client in self.clients:
            local_model = client.local_train(self.global_model, epochs=local_epochs)
            updates.append(
                ClientUpdate(client_id=client.client_id, n_samples=len(client.X_local), model=local_model)
            )

        self.global_model = self._aggregate_soft_vote(updates)
        info = {
            "round": len(self.round_history) + 1,
            "clients_participated": len(self.clients),
            "total_samples": int(sum(u.n_samples for u in updates)),
        }
        self.round_history.append(info)
        return info

    def run_federation(self, rounds: int = 5, local_epochs: int = 1) -> List[Dict[str, Any]]:
        for r in range(rounds):
            logger.info("=== Federated round %s/%s ===", r + 1, rounds)
            self.federated_round(local_epochs=local_epochs)
        return self.round_history


def simulate_federated_learning(
    X: np.ndarray,
    y: np.ndarray,
    n_clients: int = 5,
    random_state: int = 42,
) -> Tuple[RandomForestClassifier, List[Dict[str, Any]]]:
    """Partition ``X, y`` into ``n_clients`` shards and run a short federation simulation."""
    rng = np.random.default_rng(random_state)
    X = np.asarray(X, dtype=np.float32)
    y = np.asarray(y, dtype=np.int64)

    # Non-IID-ish split: sort by first feature (proxy for geography / severity skew).
    order = np.argsort(X[:, 0])
    X_sorted = X[order]
    y_sorted = y[order]

    X_train, X_val, y_train, y_val = train_test_split(
        X_sorted,
        y_sorted,
        test_size=0.15,
        random_state=random_state,
        stratify=y_sorted if len(np.unique(y_sorted)) > 1 else None,
    )

    n_clients = int(max(2, min(int(n_clients), len(X_train))))
    splits = np.array_split(rng.permutation(len(X_train)), n_clients)
    template = RandomForestClassifier(
        n_estimators=120,
        max_depth=8,
        random_state=random_state,
        n_jobs=-1,
        class_weight="balanced_subsample",
    )

    server = FederatedServer(template, X_val=X_val, y_val=y_val)
    for i, idx in enumerate(splits):
        client = FederatedClient(f"hospital_{i+1}", X_train[idx], y_train[idx])
        server.register_client(client)

    history = server.run_federation(rounds=5, local_epochs=1)
    return server.global_model, history
