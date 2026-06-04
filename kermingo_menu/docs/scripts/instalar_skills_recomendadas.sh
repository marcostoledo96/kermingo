#!/usr/bin/env bash
set -euo pipefail

# Kermingo — Instalador de skills recomendadas
# Ejecutar desde la raíz del repositorio.
# Requiere Node.js y acceso a internet.
# Para desactivar telemetría de skills.sh:
# export DISABLE_TELEMETRY=1

export DISABLE_TELEMETRY=${DISABLE_TELEMETRY:-1}

echo "Instalando skills recomendadas para Kermingo..."
echo "Revisá cualquier prompt de confirmación antes de aceptar."

npx skills add https://github.com/vercel-labs/skills --skill find-skills
npx skills add https://github.com/vercel-labs/next-skills --skill next-best-practices
npx skills add https://github.com/vercel-labs/agent-skills --skill vercel-react-best-practices
npx skills add https://github.com/vercel-labs/agent-skills --skill web-design-guidelines
npx skills add https://github.com/anthropics/skills --skill frontend-design
npx skills add https://github.com/leonxlnx/taste-skill --skill redesign-existing-projects
npx skills add https://github.com/shadcn/ui --skill shadcn
npx skills add https://github.com/anthropics/skills --skill webapp-testing
npx skills add https://github.com/obra/superpowers --skill test-driven-development
npx skills add https://github.com/obra/superpowers --skill verification-before-completion
npx skills add https://github.com/vercel-labs/agent-skills --skill deploy-to-vercel
npx skills add https://github.com/xixu-me/skills --skill github-actions-docs

echo "Skills recomendadas instaladas. Reiniciá OpenCode para que las detecte si hace falta."
