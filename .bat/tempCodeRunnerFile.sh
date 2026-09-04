#!/bin/bash
set -e

echo "=== INICIALIZANDO ECOSISTEMA DE LEVANTAMIENTO DE BIENES ==="

esperar_servicio() {
    local host=$1
    local puerto=$2
    local timeout=30
    echo "Esperando a que $host:$puerto responda..."
    for i in $(seq 1 $timeout); do
        if nc -z "$host" "$puerto" >/dev/null 2>&1; then
            echo "¡Servicio $host arriba!"
            return 0
        fi
        sleep 1
    done
    echo "Error: Tiempo de espera agotado para $host:$puerto"
    exit 1
}

echo "--- Levantando ms observabilidad ---"
cd ms-observabilidad && docker compose up --build -d && cd ..

echo "--- Levantando ms usuarios y autenticacion ---"
cd ms-usuarios-y-autenticacion && docker compose up --build -d && cd ..

echo "--- Levantando ms personas ---"
cd ms-personas && docker compose up --build -d && cd ..

echo "--- Levantando ms ubicaciones ---"
cd ms-ubicaciones && docker compose up --build -d && cd ..

echo "--- Levantando ms bienes ---"
cd ms-bienes && docker compose up --build -d && cd ..

echo "--- Levantando ms resguardos ---"
cd ms-resguardos && docker compose up --build -d && cd ..

echo "--- Levantando BFF (Puerta de enlace) ---"
cd bff && docker compose up --build -d && cd ..

echo "--- Levantando Frontend (Entorno de Integración) ---"
cd frontend && docker compose up --build -d && cd ..

echo "=== SISTEMA COMPLETO DESPLEGADO CONFIGURADO ==="