#!/bin/bash
set -e

echo "--- Deteniendo sistema ---"

echo "--- Deteniendo BFF (Puerta de enlace) ---"
cd bff
docker-compose down -v
cd ..

echo "--- Deteniendo ms usuarios y autenticacion ---"
cd ms-usuarios-y-autenticacion
docker-compose down -v
cd ..

echo "--- Deteniendo ms personas ---"
cd ms-personas 
docker-compose down -v
cd ..

echo "--- Deteniendo ms ubicaciones ---"
cd ms-ubicaciones
docker-compose down -v
cd ..

echo "--- Deteniendo ms bienes ---"
cd ms-bienes
docker-compose down -v
cd ..

echo "--- Deteniendo ms resguardos ---"
cd ms-resguardos
docker-compose down -v
cd ..

echo "--- Deteniendo ms observabilidad ---"
cd ms-observabilidad
docker-compose down -v
cd ..

echo "--- Sistema detenido ---"