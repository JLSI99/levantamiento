#!/bin/bash

echo "--- ¡Levantando Sistema! ---"

echo "--- Levantando Usuarios y Autenticacion ---"
cd ms-usuarios-y-autenticacion && docker-compose up -d --build && cd ..

echo "--- Levantando personas ---"
cd ms-personas && docker-compose up -d --build && cd ..

echo "--- ¡Sistema Arriba! ---"     