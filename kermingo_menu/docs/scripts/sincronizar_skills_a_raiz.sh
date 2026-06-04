#!/usr/bin/env bash
set -e

# Ejecutar desde la raíz del repo kermingo_menu.
# Copia las skills locales desde docs/.agents/skills a .agents/skills
# para herramientas que solo detectan skills en la raíz.

ROOT_DIR="$(pwd)"
SOURCE_DIR="$ROOT_DIR/docs/.agents/skills"
TARGET_DIR="$ROOT_DIR/.agents/skills"

if [ ! -d "$SOURCE_DIR" ]; then
  echo "No existe $SOURCE_DIR"
  exit 1
fi

mkdir -p "$TARGET_DIR"
cp -R "$SOURCE_DIR"/. "$TARGET_DIR"/

echo "Skills sincronizadas:"
echo "Origen:  $SOURCE_DIR"
echo "Destino: $TARGET_DIR"
