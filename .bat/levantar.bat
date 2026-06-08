#!/bin/bash
set -e

echo "--- Levantando sistema ---"

echo "--- Levantando ms observabilidad ---"
cd ms-observabilidad
docker-compose up -d
cd ..

echo "--- Levantando ms usuarios y autenticacion ---"
cd ms-usuarios-y-autenticacion
docker-compose up -d
cd ..

echo "--- Levantando ms personas ---"
cd ms-personas
docker-compose up -d
cd ..

echo "--- Levantando ms ubicaciones ---"
cd ms-ubicaciones
docker-compose up -d
cd ..

echo "--- Levantando ms bienes ---"
cd ms-bienes
docker-compose up -d
cd ..

echo "--- Levantando ms resguardos ---"
cd ms-resguardos
docker-compose up -d
cd ..

echo "--- Levantando BFF (Puerta de enlace) ---"
cd bff
docker-compose up -d
cd ..

echo "--- Sistema arriba ---"