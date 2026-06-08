#!/usr/bin/env bash
# ============================================
# Kermingo — ZIP de Auditoría B5.2 (revisión post-subagente)
# ============================================
# Genera un ZIP específico para que ChatGPT 5.5 audite los cambios
# que el subagente (Gemini 3.5 Flash High) aplicó a B5.2.
# ============================================
# Ejecutar desde la raíz del proyecto:
#   bash scripts/crear_zip_auditoria_b5_2.sh
# ============================================

set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ZIP_NAME="kermingo-auditoria-b5-2-${TIMESTAMP}.zip"
ZIP_PATH="$HOME/Escritorio/$ZIP_NAME"

cd "$ROOT_DIR"

echo "================================================"
echo "Kermingo — ZIP de Auditoría B5.2"
echo "================================================"
echo "Raíz: $ROOT_DIR"
echo "Destino: $ZIP_PATH"
echo ""

# Crear ZIP con solo lo relevante para esta auditoría:
# - backend/ completo (código + DB + tests + .env.example)
# - openspec/changes/backend-b5-2-schema-seed-alignment/ (artefactos del cambio)
# - openspec/changes/etapa-5-pedidos/ (cambio previo relacionado, para contexto)
# - docs/planificacion/ (docs de planificación, incluyendo 31 y 32)
# - docs/auditoria-b5-1-prompt.md y docs/auditoria-b5-prompt.md (auditorías previas)
# - docs/docs/* (changelog, estado, mapa)
# - .env.example raíz si existe
# - AGENTS.md raíz (reglas operativas)
#
# EXCLUYE:
# - node_modules, .next, .git
# - .env reales, credentials, drive-credentials.json
# - frontend/ y diseno-de-landing-kermingo/ (no se tocaron en B5.2)
# - otros cambios de openspec archivados que no son relevantes
# - otros ZIPs, coverage, dist

zip -r "$ZIP_PATH" . \
  -x "*/node_modules/*" \
  -x "*/.next/*" \
  -x "*/.git/*" \
  -x "backend/.env" \
  -x "backend/.env.local" \
  -x "frontend/.env" \
  -x "frontend/.env.local" \
  -x "*/credentials/*" \
  -x "*/drive-credentials.json" \
  -x "*/coverage/*" \
  -x "*/dist/*" \
  -x "*/.atl/*" \
  -x "*.zip" \
  -x "frontend/*" \
  -x "diseno-de-landing-kermingo/*" \
  -x "openspec/changes/etapa-3-productos-api/*" \
  -x "openspec/changes/etapa-4-auth/*" \
  -x "openspec/changes/archive/*" \
  -x "scripts/*" \
  -x "docs/scripts/*" \
  -x "entradas_kermingo/*" \
  -x "../entradas_kermingo/*" \
  -x "skills-lock.json" \
  -x "kermingo_menu.zip" \
  -x "../kermingo_menu.zip"

echo ""
echo "================================================"
echo "ZIP creado: $ZIP_PATH"
echo "Tamaño: $(du -h "$ZIP_PATH" | cut -f1)"
echo "================================================"
