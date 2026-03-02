#!/bin/bash

echo "--- ¡Deteniendo Sistema! ---"

echo "--- Deteniendo Usuarios y Autenticacion ---"
cd ms-usuarios-y-autenticacion && docker-compose down -v && cd ..

echo "--- Deteniendo Personas ---"
cd ms-personas && docker-compose down -v && cd ..

echo "--- ¡Sistema Detenido! ---"