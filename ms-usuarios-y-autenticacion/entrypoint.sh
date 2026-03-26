#!/bin/sh

echo "✅ Base de datos lista (garantizada por Docker Compose)!"

echo "🌱 Ejecutando setup_db.py..."
python3 -m src.setup_db

echo "🔥 Iniciando microservicio con Uvicorn..."
exec uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload