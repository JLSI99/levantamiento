#!/bin/bash
set -e

echo "--- Levantando sistema ---"

cd ms-usuarios-y-autenticacion
docker-compose up -d
cd ..

cd ms-personas
docker-compose up -d
cd ..

echo "--- Sistema arriba ---"