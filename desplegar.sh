#!/bin/bash

# Abortar el script inmediatamente si algún comando interno falla
set -e

DIR_CONFIG="/itsc-data/config-ecosistema"
echo "=== Iniciando Despliegue del Ecosistema de Microservicios ==="

# Matriz de módulos a desplegar (El orden respeta las dependencias lógicas)
modulos=(
  "ms-usuarios-y-autenticacion"
  "ms-ubicaciones"
  "ms-personas"
  "ms-bienes"
  "ms-resguardos"
  "bff"
  "frontend"
  "ms-observabilidad"
)

for modulo in "${modulos[@]}"; do
  echo "--------------------------------------------------"
  echo "Procesando componente: $modulo"
  echo "--------------------------------------------------"

  # Verificar si existe el directorio del módulo en el repositorio
  if [ -d "$modulo" ]; then
    cd "$modulo"

    # Enlace simbólico del archivo .env si existe en la configuración persistente
    if [ -f "$DIR_CONFIG/$modulo/.env" ]; then
      echo "Inyectando enlace simbólico para .env"
      ln -sf "$DIR_CONFIG/$modulo/.env" .env
    fi

    # Enlace simbólico del archivo .env_code si existe en la configuración persistente
    if [ -f "$DIR_CONFIG/$modulo/.env_code" ]; then
      echo "Inyectando enlace simbólico para .env_code"
      ln -sf "$DIR_CONFIG/$modulo/.env_code" .env_code
    fi

    # Compilación y levantamiento de contenedores Docker
    if [ -f "docker-compose.yml" ]; then
      echo "Ejecutando Docker Compose para $modulo..."
      docker compose down || true
      docker compose up --build -d
    else
      echo "Advertencia: No se encontró docker-compose.yml en $modulo"
    fi

    # Regresar a la raíz del monorepo
    cd ..
  else
    echo "Error Crítico: El directorio $modulo no existe en el repositorio."
    exit 1
  fi
done

echo "=== Despliegue completado exitosamente sin errores ==="