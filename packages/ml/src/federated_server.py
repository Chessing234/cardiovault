"""
Federated **server** implementing sample-weighted **FedAvg** over neural checkpoints.

The server never observes raw patient rows in this simulation — only ``state_dict``
tensors returned by hospitals after local training.

FedAvg (McMahan et al., 2017)::

    W_{t+1} = sum_k (n_k / n) * W_{t+1}^k

where ``n_k`` is the number of training examples at hospital ``k`` and ``n`` is the
total across participating clients in the round.
"""

from __future__ import annotations

import logging
from collections import defaultdict
from typing import Any, Dict, List, Optional, Sequence, Tuple

import numpy as np
import torch
from sklearn.metrics import accuracy_score, precision_score, recall_score, roc_auc_score

from federated_client import FedRiskMLP

logger = logging.getLogger(__name__)


class FederatedServer:
    """Coordinates FedAvg rounds for ``NeuralNetworkClient`` bundles."""

    def __init__(self, input_dim: int, model_type: str = "neural_network") -> None:
        self.input_dim = int(input_dim)
        self.model_type = model_type
        self.global_weights: Optional[Dict[str, torch.Tensor]] = None
        self.round_history: List[Dict[str, Any]] = []
        self.client_participation: Dict[str, int] = defaultdict(int)

    def initialize_global_model(self, seed_weights: Optional[Dict[str, torch.Tensor]] = None) -> None:
        if seed_weights is not None:
            self.global_weights = {k: v.detach().cpu().clone() for k, v in seed_weights.items()}
            logger.info("Global model initialized from seed weights (%s tensors)", len(self.global_weights))
            return

        torch.manual_seed(42)
        template = FedRiskMLP(self.input_dim)
        self.global_weights = {k: v.detach().cpu().clone() for k, v in template.state_dict().items()}
        logger.info("Global model initialized randomly (%s tensors)", len(self.global_weights))

    @staticmethod
    def aggregate_fedavg(
        client_weights: Sequence[Dict[str, torch.Tensor]],
        client_sample_counts: Sequence[int],
    ) -> Dict[str, torch.Tensor]:
        total = float(sum(client_sample_counts))
        if total <= 0:
            raise ValueError("Total sample count must be positive for FedAvg.")

        keys = client_weights[0].keys()
        aggregated: Dict[str, torch.Tensor] = {}
        for key in keys:
            aggregated[key] = torch.zeros_like(client_weights[0][key], dtype=torch.float32)

        for weights, n_k in zip(client_weights, client_sample_counts, strict=True):
            alpha = float(n_k) / total
            for key in keys:
                aggregated[key] = aggregated[key] + alpha * weights[key].to(torch.float32)

        logger.info("Aggregated %s client updates (n_total=%s)", len(client_weights), int(total))
        return aggregated

    def _evaluate_global_model(self, X_test: np.ndarray, y_test: np.ndarray) -> Dict[str, Any]:
        if self.global_weights is None:
            raise RuntimeError("Global weights are not initialized.")

        model = FedRiskMLP(self.input_dim)
        model.load_state_dict(self.global_weights, strict=True)
        model.eval()

        X_tensor = torch.as_tensor(X_test, dtype=torch.float32)
        y_arr = np.asarray(y_test).astype(int)

        with torch.no_grad():
            outputs = model(X_tensor).numpy().reshape(-1)

        predictions = (outputs >= 0.5).astype(int)
        metrics = {
            "accuracy": float(accuracy_score(y_arr, predictions)),
            "precision": float(precision_score(y_arr, predictions, zero_division=0)),
            "recall": float(recall_score(y_arr, predictions, zero_division=0)),
            "roc_auc": float(roc_auc_score(y_arr, outputs)) if len(np.unique(y_arr)) > 1 else 0.5,
            "n_test": int(len(y_arr)),
        }
        return metrics

    def run_round(
        self,
        clients: Sequence[Any],
        *,
        test_data: Optional[Tuple[np.ndarray, np.ndarray]] = None,
    ) -> Dict[str, Any]:
        """One FedAvg round: broadcast → local train → aggregate."""
        if self.global_weights is None:
            self.initialize_global_model()

        round_num = len(self.round_history) + 1
        logger.info("=== Federated round %s ===", round_num)

        for client in clients:
            client.set_weights(self.global_weights)

        client_updates: List[Dict[str, torch.Tensor]] = []
        sample_counts: List[int] = []
        client_metrics: List[Dict[str, Any]] = []

        for client in clients:
            metrics = client.local_train(client.X_local, client.y_local, epochs=client.local_epochs)
            client_updates.append(client.get_weights())
            sample_counts.append(int(len(client.X_local)))
            client_metrics.append(metrics)
            self.client_participation[str(client.client_id)] += 1

        self.global_weights = self.aggregate_fedavg(client_updates, sample_counts)

        round_metric: Dict[str, Any] = {
            "round": round_num,
            "n_clients": len(clients),
            "total_samples": int(sum(sample_counts)),
            "client_metrics": client_metrics,
        }

        if test_data is not None:
            X_test, y_test = test_data
            geval = self._evaluate_global_model(X_test, y_test)
            round_metric["global_eval"] = geval
            logger.info(
                "Global model eval — acc=%.4f roc_auc=%.4f",
                geval["accuracy"],
                geval["roc_auc"],
            )

        self.round_history.append(round_metric)
        return round_metric

    def run_federation(
        self,
        clients: Sequence[Any],
        *,
        rounds: int = 10,
        test_data: Optional[Tuple[np.ndarray, np.ndarray]] = None,
    ) -> List[Dict[str, Any]]:
        logger.info("Starting federated learning: rounds=%s clients=%s", rounds, len(clients))
        if self.global_weights is None:
            self.initialize_global_model()

        for _ in range(int(rounds)):
            self.run_round(clients, test_data=test_data)

        logger.info("Federated learning complete (%s rounds)", rounds)
        return self.round_history

    def get_global_weights(self) -> Dict[str, torch.Tensor]:
        if self.global_weights is None:
            raise RuntimeError("Global weights are not initialized.")
        return self.global_weights

    def get_participation_stats(self) -> Dict[str, int]:
        return dict(self.client_participation)
