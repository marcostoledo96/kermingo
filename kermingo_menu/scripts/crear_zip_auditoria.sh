#!/usr/bin/env bash
# ============================================
# Kermingo — Crear ZIP de Auditoría
# ============================================
# Ejecutar desde la raíz del proyecto:
#   bash scripts/crear_zip_auditoria.sh
# ============================================

set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ZIP_NAME="kermingo_auditoria_${TIMESTAMP}.zip"
ZIP_PATH="$HOME/Escritorio/$ZIP_NAME"

cd "$ROOT_DIR"

echo "Creando ZIP de auditoría..."

# Crear ZIP excluyendo archivos sensibles y artefactos pesados
zip -r "$ZIP_PATH" . \
  -x "*/node_modules/*" \
  -x "*/.next/*" \
  -x "backend/.env" \
  -x "backend/.env.local" \
  -x "frontend/.env" \
  -x "frontend/.env.local" \
  -x "*/credentials/*" \
  -x "*/drive-credentials.json" \
  -x "*/coverage/*" \
  -x "*/dist/*" \
  -x "*.zip" \
  -x ".atl/*" \
  -x ".git/*"

echo ""
echo "ZIP creado: $ZIP_PATH"
echo "Tamaño: $(du -h "$ZIP_PATH" | cut -f1)"
