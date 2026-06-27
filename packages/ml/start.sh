#!/usr/bin/env bash
set -euo pipefail
exec gunicorn api.main:app --bind "0.0.0.0:${PORT:-8000}"
