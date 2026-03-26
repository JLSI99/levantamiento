#!/bin/sh

echo "✅ Base de datos lista (garantizada por Docker Compose)!"

echo "🔥 Iniciando microservicio con Uvicorn..."
exec uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload