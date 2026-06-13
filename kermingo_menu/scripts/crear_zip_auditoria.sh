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
# Nota: .env.example se incluye a propósito (no contiene secrets)
zip -r "$ZIP_PATH" . \
  -x "*/node_modules/*" \
  -x "*/.next/*" \
  -x "backend/.env" \
  -x "backend/.env.local" \
  -x "backend/.env.*.local" \
  -x "frontend/.env" \
  -x "frontend/.env.local" \
  -x "frontend/.env.*.local" \
  -x "*/credentials/*" \
  -x "*/drive-credentials.json" \
  -x "*/coverage/*" \
  -x "*/dist/*" \
  -x "*.zip" \
  -x "*.key" \
  -x "*.pem" \
  -x ".atl/*" \
  -x ".git/*"

echo ""
echo "ZIP creado: $ZIP_PATH"
echo "Tamaño: $(du -h "$ZIP_PATH" | cut -f1)"

# ── Post-generation verification ──
echo ""
echo "Verificando exclusiones..."

VIOLATIONS=$(unzip -l "$ZIP_PATH" 2>/dev/null | grep -iE '(^|/)\.env$|\.env\.local$|/node_modules/|/credentials/|drive-credentials\.json|\.key$|\.pem$|/\.next/|/coverage/|/dist/' | grep -v '\.env\.example' || true)

if [ -n "$VIOLATIONS" ]; then
  echo "❌ VERIFICACIÓN FALLIDA — Se encontraron archivos excluidos en el ZIP:"
  echo "$VIOLATIONS"
  echo ""
  echo "Eliminando ZIP inválido..."
  rm -f "$ZIP_PATH"
  exit 1
else
  echo "✅ Verificación exitosa — No se encontraron archivos excluidos en el ZIP."
fi