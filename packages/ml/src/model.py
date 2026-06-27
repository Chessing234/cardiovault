"""
Cardiovascular risk prediction models.

Combines classical baselines (logistic regression, random forest, gradient boosting)
with a small feed-forward neural network and an optional **weighted ensemble**
of calibrated probabilities.

The neural network uses batch normalisation and dropout as regularisers — common
choices for modest tabular datasets where overfitting is a real risk.
"""

from __future__ import annotations

import logging
import os
import pickle
from typing import Any, Dict, List, Optional

import numpy as np
import torch
import torch.nn as nn
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from torch.utils.data import DataLoader, TensorDataset

logger = logging.getLogger(__name__)


class _CardioNet(nn.Module):
    """Compact MLP for binary cardiovascular risk."""

    def __init__(self, input_dim: int) -> None:
        super().__init__()
        self.network = nn.Sequential(
            nn.Linear(input_dim, 128),
            nn.BatchNorm1d(128),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(128, 64),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
            nn.Sigmoid(),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:  # type: ignore[override]
        return self.network(x)


class CardiovascularRiskModel:
    """Train/evaluate an ensemble of classical + neural models on tabular features."""

    def __init__(self, input_dim: int, model_type: str = "ensemble", random_state: int = 42) -> None:
        self.input_dim = input_dim
        self.model_type = model_type
        self.random_state = random_state
        self.models: Dict[str, Any] = {}
        self.is_trained = False
        self.feature_importance: Optional[np.ndarray] = None

    def _build_neural_network(self) -> nn.Module:
        return _CardioNet(self.input_dim)

    def train_traditional_models(self, X_train: np.ndarray, y_train: np.ndarray) -> Dict[str, Any]:
        """Fit logistic regression, random forest, and gradient boosting."""
        results: Dict[str, Any] = {}

        logger.info("Training logistic regression (baseline)...")
        lr = LogisticRegression(
            max_iter=2000,
            random_state=self.random_state,
            class_weight="balanced",
            solver="lbfgs",
        )
        lr.fit(X_train, y_train)
        self.models["logistic_regression"] = lr
        results["logistic_regression"] = {"trained": True}

        logger.info("Training random forest...")
        rf = RandomForestClassifier(
            n_estimators=400,
            max_depth=12,
            min_samples_split=4,
            random_state=self.random_state,
            class_weight="balanced_subsample",
            n_jobs=-1,
        )
        rf.fit(X_train, y_train)
        self.models["random_forest"] = rf
        self.feature_importance = rf.feature_importances_
        results["random_forest"] = {"trained": True}

        logger.info("Training gradient boosting...")
        gbm = GradientBoostingClassifier(
            n_estimators=250,
            max_depth=3,
            learning_rate=0.05,
            random_state=self.random_state,
        )
        gbm.fit(X_train, y_train)
        self.models["gradient_boosting"] = gbm
        results["gradient_boosting"] = {"trained": True}

        return results

    def train_neural_network(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        epochs: int = 150,
        batch_size: int = 32,
        learning_rate: float = 0.001,
        validation_split: float = 0.1,
        min_epochs: int = 50,
        max_patience: int = 30,
    ) -> Dict[str, Any]:
        """Train the PyTorch classifier with early stopping **after** ``min_epochs``."""
        logger.info("Training neural network for up to %s epochs...", epochs)

        X_tensor = torch.as_tensor(X_train, dtype=torch.float32)
        y_tensor = torch.as_tensor(y_train, dtype=torch.float32).unsqueeze(1)

        n = len(X_tensor)
        val_size = int(max(1, round(n * validation_split)))
        val_size = min(val_size, n - 1)  # keep at least one train row
        perm = torch.randperm(n)
        val_idx = perm[:val_size]
        train_idx = perm[val_size:]

        train_loader = DataLoader(
            TensorDataset(X_tensor[train_idx], y_tensor[train_idx]),
            batch_size=min(batch_size, len(train_idx)),
            shuffle=True,
            drop_last=False,
        )
        val_loader = DataLoader(
            TensorDataset(X_tensor[val_idx], y_tensor[val_idx]),
            batch_size=min(batch_size, len(val_idx)),
            shuffle=False,
        )

        model = self._build_neural_network()
        criterion = nn.BCELoss()
        optimizer = torch.optim.Adam(model.parameters(), lr=learning_rate, weight_decay=1e-5)
        scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
            optimizer, mode="min", patience=8, factor=0.5
        )

        best_state: Optional[Dict[str, Any]] = None
        best_val = float("inf")
        patience = 0
        history: Dict[str, List[float]] = {"train_loss": [], "val_loss": [], "val_auc": []}

        for epoch in range(epochs):
            model.train()
            train_losses: List[float] = []
            for batch_x, batch_y in train_loader:
                optimizer.zero_grad(set_to_none=True)
                outputs = model(batch_x)
                loss = criterion(outputs, batch_y)
                loss.backward()
                optimizer.step()
                train_losses.append(float(loss.detach().cpu()))

            model.eval()
            val_losses: List[float] = []
            val_preds: List[float] = []
            val_true: List[float] = []
            with torch.no_grad():
                for batch_x, batch_y in val_loader:
                    outputs = model(batch_x)
                    loss = criterion(outputs, batch_y)
                    val_losses.append(float(loss.detach().cpu()))
                    val_preds.extend(outputs.squeeze(-1).cpu().numpy().tolist())
                    val_true.extend(batch_y.squeeze(-1).cpu().numpy().tolist())

            avg_train = float(np.mean(train_losses)) if train_losses else 0.0
            avg_val = float(np.mean(val_losses)) if val_losses else 0.0
            val_auc = (
                float(roc_auc_score(val_true, val_preds))
                if len(set(val_true)) > 1
                else 0.5
            )

            history["train_loss"].append(avg_train)
            history["val_loss"].append(avg_val)
            history["val_auc"].append(val_auc)
            scheduler.step(avg_val)

            improved = avg_val < best_val - 1e-5
            if improved:
                best_val = avg_val
                best_state = {k: v.cpu().clone() for k, v in model.state_dict().items()}
                patience = 0
            else:
                patience += 1

            if (epoch + 1) % 10 == 0:
                logger.info(
                    "Epoch %s/%s — train_loss=%.4f val_loss=%.4f val_auc=%.4f",
                    epoch + 1,
                    epochs,
                    avg_train,
                    avg_val,
                    val_auc,
                )

            if epoch + 1 >= min_epochs and patience >= max_patience:
                logger.info("Early stopping at epoch %s", epoch + 1)
                break

        if best_state is not None:
            model.load_state_dict(best_state)
        self.models["neural_network"] = model
        self.is_trained = True
        return {"history": history, "best_val_loss": best_val}

    def predict(self, X: np.ndarray, model_name: str = "ensemble") -> np.ndarray:
        """Return positive-class probabilities."""
        X = np.asarray(X, dtype=np.float32)

        if model_name == "ensemble":
            weights = {
                "logistic_regression": 0.10,
                "random_forest": 0.35,
                "gradient_boosting": 0.35,
                "neural_network": 0.20,
            }
            preds: List[np.ndarray] = []
            wts: List[float] = []
            for name, w in weights.items():
                if name not in self.models:
                    continue
                if name == "neural_network":
                    self.models[name].eval()
                    with torch.no_grad():
                        xt = torch.as_tensor(X, dtype=torch.float32)
                        p = self.models[name](xt).squeeze(-1).cpu().numpy()
                else:
                    p = self.models[name].predict_proba(X)[:, 1]
                preds.append(np.asarray(p, dtype=np.float32))
                wts.append(w)

            if not preds:
                raise ValueError("No trained models available for ensemble prediction.")

            w_arr = np.asarray(wts, dtype=np.float32)
            w_arr = w_arr / w_arr.sum()
            stacked = np.stack(preds, axis=0)
            return np.average(stacked, axis=0, weights=w_arr)

        if model_name not in self.models:
            raise ValueError(f"Unknown model: {model_name}")

        if model_name == "neural_network":
            self.models[model_name].eval()
            with torch.no_grad():
                xt = torch.as_tensor(X, dtype=torch.float32)
                return self.models[model_name](xt).squeeze(-1).cpu().numpy()

        return self.models[model_name].predict_proba(X)[:, 1]

    def evaluate(self, X_test: np.ndarray, y_test: np.ndarray, model_name: str = "ensemble") -> Dict[str, Any]:
        """Compute common classification metrics on a holdout set."""
        y_proba = self.predict(X_test, model_name)
        y_pred = (y_proba >= 0.5).astype(int)

        metrics: Dict[str, Any] = {
            "accuracy": float(accuracy_score(y_test, y_pred)),
            "precision": float(precision_score(y_test, y_pred, zero_division=0)),
            "recall": float(recall_score(y_test, y_pred, zero_division=0)),
            "f1_score": float(f1_score(y_test, y_pred, zero_division=0)),
            "roc_auc": float(roc_auc_score(y_test, y_proba)) if len(set(y_test)) > 1 else 0.5,
            "confusion_matrix": confusion_matrix(y_test, y_pred).tolist(),
            "model": model_name,
        }

        logger.info("Evaluation (%s):", model_name)
        for key, value in metrics.items():
            if key == "confusion_matrix":
                continue
            logger.info("  %s: %s", key, value)
        return metrics

    def save(self, filepath: str) -> None:
        """Persist sklearn models + NN weights to ``filepath`` (pickle) and ``_nn.pt``."""
        nn_path = filepath.replace(".pkl", "_nn.pt")
        save_dict: Dict[str, Any] = {
            "model_type": self.model_type,
            "input_dim": self.input_dim,
            "random_state": self.random_state,
            "feature_importance": self.feature_importance,
            "sklearn_models": {},
        }

        for name, model in self.models.items():
            if name == "neural_network":
                torch.save(model.state_dict(), nn_path)
            else:
                save_dict["sklearn_models"][name] = model

        with open(filepath, "wb") as f:
            pickle.dump(save_dict, f)

        logger.info("Saved model bundle to %s (nn=%s)", filepath, os.path.exists(nn_path))

    @classmethod
    def load(cls, filepath: str) -> CardiovascularRiskModel:
        """Load bundle created by :meth:`save`."""
        with open(filepath, "rb") as f:
            save_dict = pickle.load(f)

        input_dim = int(save_dict["input_dim"])
        instance = cls(input_dim=input_dim, model_type=str(save_dict.get("model_type", "ensemble")))
        instance.random_state = int(save_dict.get("random_state", 42))
        instance.models = dict(save_dict.get("sklearn_models", {}))
        instance.feature_importance = save_dict.get("feature_importance")

        nn_path = filepath.replace(".pkl", "_nn.pt")
        if os.path.exists(nn_path):
            net = instance._build_neural_network()
            try:
                state = torch.load(nn_path, map_location="cpu", weights_only=True)
            except TypeError:
                # PyTorch versions prior to ``weights_only`` still work for ``state_dict`` pickles.
                state = torch.load(nn_path, map_location="cpu")
            net.load_state_dict(state)
            net.eval()
            instance.models["neural_network"] = net

        instance.is_trained = True
        return instance
