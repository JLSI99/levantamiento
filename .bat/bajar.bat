#!/bin/bash
set -e

echo "--- Deteniendo sistema ---"

cd ms-usuarios-y-autenticacion
docker-compose down
cd ..

cd ms-personas
docker-compose down
cd ..

echo "--- Sistema detenido ---"