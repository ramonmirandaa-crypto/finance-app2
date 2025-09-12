#!/usr/bin/env bash

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker não está instalado. Instale Docker para usar 'docker compose build' e 'docker compose up -d'."
  exit 1
else
  echo "Docker está instalado."
fi
