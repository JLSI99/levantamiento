#!/bin/bash

echo "--- ¡Deteniendo Sistema! ---"

echo "--- Deteniendo Resguardo ---"
cd ms-personas-y-usuarios && docker-compose down -v && cd ..

echo "--- ¡Sistema Detenido! ---"