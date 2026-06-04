# 24 — Skills recomendadas para OpenCode / skills.sh

## Estado

Las skills locales específicas de Kermingo están actualmente en:

```txt
docs/.agents/skills/
```

Si OpenCode no las detecta desde esa ubicación, copiarlas a:

```txt
.agents/skills/
```

con:

```bash
bash docs/scripts/sincronizar_skills_a_raiz.sh
```

## Skills locales incluidas

```txt
docs/.agents/skills/kermingo-backend-api/SKILL.md
docs/.agents/skills/kermingo-frontend-v0/SKILL.md
docs/.agents/skills/kermingo-verification/SKILL.md
```

## Skills externas sugeridas de skills.sh

Estas skills son útiles para este proyecto:

```txt
vercel-labs/next-skills/next-best-practices
vercel-labs/next-skills/vercel-react-best-practices
vercel-labs/next-skills/accessibility
vercel-labs/next-skills/seo
vercel-labs/next-skills/security
```

También buscar en skills.sh skills relacionadas con:

```txt
react
typescript
tailwind
testing
playwright
node
express
mysql
api
security
```

## Regla

No instalar skills externas a ciegas en medio de una tarea crítica.  
Primero instalarlas, reiniciar OpenCode y luego ejecutar tareas.

## Script sugerido

```bash
bash docs/scripts/instalar_skills_recomendadas.sh
```

## Verificación

Después de instalar:

1. Reiniciar OpenCode.
2. Confirmar que detecta skills locales.
3. Si no detecta `docs/.agents/skills`, ejecutar sincronización a raíz.
