"""
Federated **client** implementations for the CardioVault FL simulation.

Each ``NeuralNetworkClient`` keeps patient rows **local** to a hospital shard. The
coordinator only ever receives **weight tensors** (FedAvg), never raw ``X`` / ``y``.

This is an educational simulation — production FL should use Flower / PySyft /
NVIDIA FLARE with secure aggregation and threat modelling.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Union

import numpy as np
import torch
import torch.nn as nn
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, roc_auc_score

logger = logging.getLogger(__name__)


class FedRiskMLP(nn.Module):
    """Small MLP used across all FL clients + the server evaluation mirror."""

    def __init__(self, input_dim: int) -> None:
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, 64),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
            nn.Sigmoid(),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:  # type: ignore[override]
        return self.net(x)


class NeuralNetworkClient:
    """Hospital client that trains a PyTorch classifier locally."""

    def __init__(self, client_id: str, input_dim: int, random_seed: int = 42) -> None:
        self.client_id = client_id
        self.input_dim = input_dim
        self.random_seed = random_seed
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        torch.manual_seed(random_seed)
        self.model = FedRiskMLP(input_dim).to(self.device)
        self.training_history: List[float] = []

    def local_train(
        self,
        X: np.ndarray,
        y: np.ndarray,
        epochs: int = 5,
        batch_size: int = 32,
        lr: float = 0.02,
    ) -> Dict[str, Any]:
        """Train on **local** hospital data only."""
        self.model.train()

        X_tensor = torch.as_tensor(X, dtype=torch.float32, device=self.device)
        y_tensor = torch.as_tensor(y, dtype=torch.float32, device=self.device).unsqueeze(1)

        dataset = torch.utils.data.TensorDataset(X_tensor, y_tensor)
        loader = torch.utils.data.DataLoader(
            dataset,
            batch_size=min(batch_size, max(1, len(X_tensor))),
            shuffle=True,
        )

        optimizer = torch.optim.Adam(self.model.parameters(), lr=lr)
        criterion = nn.BCELoss()

        epoch_losses: List[float] = []
        for _ in range(epochs):
            batch_losses: List[float] = []
            for batch_X, batch_y in loader:
                optimizer.zero_grad(set_to_none=True)
                outputs = self.model(batch_X)
                loss = criterion(outputs, batch_y)
                loss.backward()
                optimizer.step()
                batch_losses.append(float(loss.detach().cpu()))
            epoch_losses.append(float(np.mean(batch_losses)) if batch_losses else 0.0)

        self.training_history.extend(epoch_losses)
        logger.info(
            "Client %s: local training finished (epochs=%s, final_loss=%.4f)",
            self.client_id,
            epochs,
            epoch_losses[-1],
        )

        return {
            "client_id": self.client_id,
            "epochs_trained": epochs,
            "final_loss": epoch_losses[-1],
            "loss_history": epoch_losses,
        }

    def get_weights(self) -> Dict[str, torch.Tensor]:
        """FedAvg payload: CPU tensors cloned from local parameters."""
        return {name: param.detach().cpu().clone() for name, param in self.model.state_dict().items()}

    def set_weights(self, weights: Dict[str, torch.Tensor]) -> None:
        """Install aggregated global weights before a local round."""
        with torch.no_grad():
            own = self.model.state_dict()
            for name, tensor in weights.items():
                if name not in own:
                    continue
                own[name].copy_(tensor.to(self.model.state_dict()[name].device))

    def evaluate(self, X: np.ndarray, y: np.ndarray) -> Dict[str, Any]:
        """Evaluate the **current** local model on a holdout shard."""
        self.model.eval()
        X_tensor = torch.as_tensor(X, dtype=torch.float32, device=self.device)
        y_arr = np.asarray(y).astype(int)

        with torch.no_grad():
            outputs = self.model(X_tensor).detach().cpu().numpy().reshape(-1)

        predictions = (outputs >= 0.5).astype(int)
        acc = float(np.mean(predictions == y_arr))
        try:
            auc = float(roc_auc_score(y_arr, outputs))
        except ValueError:
            auc = 0.5

        return {"client_id": self.client_id, "accuracy": acc, "auc": auc, "n_samples": len(X)}


class TreeBasedClient:
    """Optional tree baseline client (does not participate in NN FedAvg)."""

    def __init__(self, client_id: str, random_seed: int = 42) -> None:
        self.client_id = client_id
        self.random_seed = random_seed
        self.model = RandomForestClassifier(
            n_estimators=50,
            max_depth=8,
            random_state=random_seed,
            n_jobs=-1,
        )
        self.is_trained = False

    def local_train(self, X: np.ndarray, y: np.ndarray, **kwargs: Any) -> Dict[str, Any]:
        del kwargs
        self.model.fit(X, y)
        self.is_trained = True
        logger.info("Client %s: RF trained on %s samples", self.client_id, len(X))
        return {
            "client_id": self.client_id,
            "n_samples": len(X),
            "n_features": X.shape[1],
            "model_type": "random_forest",
        }

    def get_model(self) -> RandomForestClassifier:
        return self.model

    def evaluate(self, X: np.ndarray, y: np.ndarray) -> Dict[str, Any]:
        if not self.is_trained:
            return {"error": "Model not trained", "client_id": self.client_id}

        predictions = self.model.predict(X)
        probabilities = self.model.predict_proba(X)[:, 1]
        return {
            "client_id": self.client_id,
            "accuracy": float(accuracy_score(y, predictions)),
            "auc": float(roc_auc_score(y, probabilities)),
            "n_samples": len(X),
        }


ClientLike = Union[NeuralNetworkClient, TreeBasedClient]


class FederatedClientData:
    """Bundles a client object with its **local-only** shard for the server loop."""

    def __init__(
        self,
        client: ClientLike,
        X_local: np.ndarray,
        y_local: np.ndarray,
        *,
        local_epochs: int = 5,
    ) -> None:
        self.client = client
        self.client_id = client.client_id
        self.X_local = np.asarray(X_local, dtype=np.float32)
        self.y_local = np.asarray(y_local, dtype=np.float64)
        self.local_epochs = local_epochs

    def local_train(self, X: np.ndarray, y: np.ndarray, epochs: Optional[int] = None) -> Dict[str, Any]:
        ep = self.local_epochs if epochs is None else int(epochs)
        if isinstance(self.client, NeuralNetworkClient):
            return self.client.local_train(X, y, epochs=ep)
        return self.client.local_train(X, y)

    def get_weights(self) -> Dict[str, torch.Tensor]:
        if not isinstance(self.client, NeuralNetworkClient):
            raise TypeError("FedAvg server expects NeuralNetworkClient bundles for weight aggregation.")
        return self.client.get_weights()

    def set_weights(self, weights: Dict[str, torch.Tensor]) -> None:
        if not isinstance(self.client, NeuralNetworkClient):
            raise TypeError("FedAvg server expects NeuralNetworkClient bundles.")
        self.client.set_weights(weights)
