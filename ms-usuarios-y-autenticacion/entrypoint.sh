#!/bin/sh

set -e

echo "✅ Base de datos en línea y respondiendo peticiones."

echo "🌱 Ejecutando inicialización de esquemas y semillas (setup_db.py)..."
python3 -m src.setup_db

if [ "$DEBUG" = "True" ]; then
    echo "🔥 Modo Desarrollo: Activando hot-reload en Uvicorn..."
    exec uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
else
    echo "🚀 Modo Producción: Inicializando socket multiproceso..."
    
    exec uvicorn src.main:app --host 0.0.0.0 --port 8000 --workers 4 --log-level info
fi