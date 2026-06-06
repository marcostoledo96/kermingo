#!/usr/bin/env bash
set -euo pipefail

# Ejecutar desde la raíz del proyecto:
# bash scripts/crear_zip_auditoria.sh

OUTPUT="kermingo_auditoria_$(date +%Y%m%d_%H%M%S).zip"

zip -r "$OUTPUT" \
  AGENTS.md \
  backend \
  frontend \
  docs \
  openspec \
  scripts \
  .agents \
  -x "*/node_modules/*" \
  -x "*/.next/*" \
  -x "*/coverage/*" \
  -x "*/dist/*" \
  -x "*/.env" \
  -x "*/.env.local" \
  -x "*/credentials/*" \
  -x "*drive-credentials.json" \
  -x "*.log"

echo "ZIP de auditoría creado: $OUTPUT"
