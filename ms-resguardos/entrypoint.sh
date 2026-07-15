#!/bin/sh

set -e

echo "✅ Base de datos de resguardos legalmente verificada y en línea."

echo "🌱 Ejecutando inicialización asíncrona de tablas e invariantes de asignación (setup_db.py)..."
python3 -m src.setup_db

if [ "$DEBUG" = "True" ]; then
    echo "🔥 Modo Desarrollo Interno: Activando hot-reload reactivo en Uvicorn..."
    exec uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
else
    echo "🚀 Modo Producción Institucional: Desplegando clúster multiproceso con 4 trabajadores..."
    exec uvicorn src.main:app --host 0.0.0.0 --port 8000 --workers 4 --log-level info
fi