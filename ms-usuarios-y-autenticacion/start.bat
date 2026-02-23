#!/bin/bash

echo "--- ¡Levantando sistema! ---"

echo "--- Levantando Usuarios y personas ---"
cd ms-personas-y-usuarios && docker-compose up -d --build && cd ..

echo "--- ¡Sistema Arriba! ---"     