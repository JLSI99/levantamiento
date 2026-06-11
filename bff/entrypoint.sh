#!/bin/sh
set -e

echo "🚀 Validando disponibilidad de la malla completa de microservicios internos..."

python3 -c "
import socket
import sys
import time
import os
from urllib.parse import urlparse

# Extraer hosts de las variables de entorno reales del .env
urls = [
    os.getenv('MS_AUTH_URL', 'http://ms_usuarios_api:8000'),
    os.getenv('MS_BIENES_URL', 'http://ms_bienes_api:8000'),
    os.getenv('MS_RESGUARDOS_URL', 'http://ms_resguardo_api:8000'),
    os.getenv('MS_PERSONAS_URL', 'http://ms_personas_api:8000'),
    os.getenv('MS_UBICACIONES_URL', 'http://ms_ubicaciones_api:8000')
]

services = []
for url in urls:
    parsed = urlparse(url)
    host = parsed.hostname
    port = parsed.port if parsed.port else (443 if parsed.scheme == 'https' else 80)
    if host:
        services.append((host, port))

for host, port in services:
    success = False
    for i in range(30):
        try:
            with socket.create_connection((host, port), timeout=1):
                print(f'✅ Conexión establecida exitosamente con: {host}:{port}')
                success = True
                break
        except (socket.error, socket.timeout):
            print(f'⏳ Esperando a {host}:{port} (intento {i+1}/30)...')
            time.sleep(1)
    if not success:
        print(f'❌ Error crítico: El servicio {host}:{port} no respondió en el tiempo límite.')
        sys.exit(1)
"

echo "🔥 Toda la malla interna de servicios detectada y operativa. Inicializando BFF..."

exec uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload