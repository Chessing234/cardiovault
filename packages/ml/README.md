# CardioVault ML (Byte2Beat)

This package contains the **Kaggle-ready** cardiovascular risk stack used by CardioVault:

- `src/data_loader.py` — multi-dataset ingestion + medically motivated feature engineering
- `src/model.py` — classical models + PyTorch MLP + weighted ensemble + save/load
- `src/evaluate.py` — ROC/PR/calibration plots + SHAP summaries
- `src/federated.py` — legacy **RandomForest** soft-vote simulation (`simulate_federated_learning`)
- `src/federated_client.py` / `src/federated_server.py` / `src/federated_visualization.py` — **PyTorch FedAvg** demo clients + server + charts
- `notebooks/federated_demo.ipynb` — standalone FL narrative (regenerate via `python3 scripts/build_federated_notebook.py`)
- `cardiovault_model.ipynb` — end-to-end narrative notebook (regenerate via `python3 scripts/build_notebook.py`)

## Quickstart (local)

```bash
cd packages/ml
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export PYTHONPATH=src
python -c "from data_loader import load_and_preprocess; print(load_and_preprocess(None)[0].shape)"
```

The default path downloads the **public UCI Cleveland** heart disease CSV (requires network).

## Notebook / Kaggle

1. Upload `packages/ml/src` (or the whole repo) to a Kaggle dataset or working directory.
2. Enable **Internet** (for the UCI download) unless you vendor a CSV.
3. Run `notebooks/federated_demo.ipynb` for the **FedAvg** hospital simulation.

## Honest scope notes

- `federated.py` keeps a **tree soft-vote** sketch for backwards compatibility — it is **not** FedAvg in weight space.
- UCI rows omit several real-world variables; some fields are **proxied/imputed** to keep a unified schema.
