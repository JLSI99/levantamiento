#!/bin/bash
set -e

echo "--- Levantando sistema ---"

echo "--- Levantando ms observabilidad ---"
cd ms-observabilidad
docker-compose up --build -d
cd ..

echo "--- Levantando ms usuarios y autenticacion ---"
cd ms-usuarios-y-autenticacion
docker-compose up --build -d
cd ..

echo "--- Levantando ms personas ---"
cd ms-personas
docker-compose up --build -d
cd ..

echo "--- Levantando ms ubicaciones ---"
cd ms-ubicaciones
docker-compose up --build -d
cd ..

echo "--- Levantando ms bienes ---"
cd ms-bienes
docker-compose up --build -d
cd ..

echo "--- Levantando ms resguardos ---"
cd ms-resguardos
docker-compose up --build -d
cd ..

echo "--- Levantando BFF (Puerta de enlace) ---"
cd bff
docker-compose up --build -d
cd ..

echo "--- Sistema arriba ---"