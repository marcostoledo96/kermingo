# Kermingo — Registro de Skills del Proyecto

<!-- Última actualización: 2026-06-04 -->
<!-- Autogenerado parcialmente por gentle-ai skill-registry refresh + clasificación manual -->

## Resumen

| Tipo | Cantidad |
|------|----------|
| Skills locales (proyecto) | 16 |
| Skills globales (usuario) | 39 |
| **Total** | **55** |

---

## 1. Skills locales del proyecto

Instaladas en `.agents/skills/` y registradas en `.atl/skill-registry.md`.

### 🔴 De trabajo diario (siempre cargar)

| Skill | Archivo | Cuándo usar | 
|-------|---------|-------------|
| `kermingo-backend-api` | `.agents/skills/kermingo-backend-api/SKILL.md` | Trabajo en `backend/`: Express, MySQL, MVC, auth, pedidos, stock, Drive, Excel |
| `kermingo-frontend-v0` | `.agents/skills/kermingo-frontend-v0/SKILL.md` | Trabajo en `frontend/`: Next.js, React, Tailwind, v0 |
| `kermingo-verification` | `.agents/skills/kermingo-verification/SKILL.md` | Antes de cerrar cualquier tarea: build, tests, flujo, docs |

### 🟡 Patrones y mejores prácticas

| Skill | Archivo | Cuándo usar |
|-------|---------|-------------|
| `next-best-practices` | `.agents/skills/next-best-practices/SKILL.md` | Trabajo con archivos Next.js: layouts, rutas, server components, data fetching |
| `next-cache-components` | `.agents/skills/next-cache-components/SKILL.md` | Necesito cache: PPR, use cache, cacheLife, cacheTag |
| `next-upgrade` | `.agents/skills/next-upgrade/SKILL.md` | Migrar Next.js a versión más nueva |
| `vercel-react-best-practices` | `.agents/skills/vercel-react-best-practices/SKILL.md` | Optimizar performance React/Next.js, bundles, data fetching |
| `vercel-composition-patterns` | `.agents/skills/vercel-composition-patterns/SKILL.md` | Composición de componentes, server/client boundaries |
| `vercel-react-view-transitions` | `.agents/skills/vercel-react-view-transitions/SKILL.md` | Animaciones entre rutas/páginas con View Transition API |

### 🔵 Testing

| Skill | Archivo | Cuándo usar |
|-------|---------|-------------|
| `tdd` | `.agents/skills/tdd/SKILL.md` | Red-green-refactor, TDD, test-first development |

### 🟢 Deploy y operaciones

| Skill | Archivo | Cuándo usar |
|-------|---------|-------------|
| `deploy-to-vercel` | `.agents/skills/deploy-to-vercel/SKILL.md` | Deployar frontend a Vercel, preview deployments |
| `vercel-cli-with-tokens` | `.agents/skills/vercel-cli-with-tokens/SKILL.md` | Vercel CLI con tokens (no login interactivo) |
| `vercel-optimize` | `.agents/skills/vercel-optimize/SKILL.md` | Optimizar costo/performance en Vercel, reducir factura |

### ⚪ Diseño y UX

| Skill | Archivo | Cuándo usar |
|-------|---------|-------------|
| `web-design-guidelines` | `.agents/skills/web-design-guidelines/SKILL.md` | Revisar UI contra web interface guidelines, auditar diseño |
| `writing-guidelines` | `.agents/skills/writing-guidelines/SKILL.md` | Revisar estilo de escritura en docs, UI text, mensajes |

### ⚫ No aplican a este proyecto (instaladas pero ignorar)

| Skill | Motivo |
|-------|--------|
| `vercel-react-native-skills` | No usamos React Native |

---

## 2. Skills globales relevantes

Disponibles vía `~/.agents/skills/` y `~/.config/opencode/skills/`. Cargar según contexto.

### 🔴 Alta prioridad para Kermingo

| Skill | Ubicación | Cuándo usar |
|-------|-----------|-------------|
| `nodejs-backend-patterns` | global | Crear backend Express, middleware, auth, DB |
| `frontend-design` | global | Crear UI/componentes distintivos, evitar IA genérica |
| `ui-ux-pro-max` | global | Paletas, estilos, UX patterns para web/mobile |
| `tailwind-design-system` | global | Design tokens, TW4, componentes responsive |
| `playwright-best-practices` | global | E2E testing, visual, POM, CI/CD |
| `typescript-advanced-types` | global | Tipado complejo, genéricos, mapped types |

### 🟡 Media prioridad

| Skill | Ubicación | Cuándo usar |
|-------|-----------|-------------|
| `systematic-debugging` | global | Bugs, test failures, comportamiento inesperado |
| `polish` | global | Quality pass pre-ship, alineación, espaciado |
| `audit` | global | Accessibility, performance, theming checks |
| `documentation-writer` | global | Documentación técnica, guías, referencia |
| `cognitive-doc-design` | OpenCode | Docs claras, reducir carga cognitiva |

### 🔵 Workflow & SDD

| Skill | Ubicación | Cuándo usar |
|-------|-----------|-------------|
| `sdd-explore` | OpenCode | Explorar ideas o código antes de proponer |
| `sdd-propose` | OpenCode | Crear propuesta de cambio |
| `sdd-design` | OpenCode | Diseño técnico de cambio |
| `sdd-spec` | OpenCode | Especificaciones detalladas |
| `sdd-tasks` | OpenCode | Breakdown en tareas |
| `sdd-apply` | OpenCode | Implementar tareas |
| `sdd-verify` | OpenCode | Validar contra specs |
| `sdd-archive` | OpenCode | Cerrar cambio y sincronizar docs |
| `sdd-init` | OpenCode | Inicializar proyecto SDD |
| `sdd-onboard` | OpenCode | Walkthrough guiado de SDD |
| `skill-registry` | OpenCode | Refrescar índice de skills |
| `branch-pr` | OpenCode | Crear PRs con issue-first checks |
| `chained-pr` | OpenCode | PRs >400 líneas, stacked PRs |
| `work-unit-commits` | OpenCode | Commits atómicos reviewables |
| `judgment-day` | OpenCode | Review adversarial ciego |
| `comment-writer` | OpenCode | Feedback, PR comments |
| `issue-creation` | OpenCode | Crear issues bien formados |

### ⚪ Otras disponibles (contexto específico)

| Skill | Ubicación | Cuándo usar |
|-------|-----------|-------------|
| `firecrawl*` (11 skills) | global | Web scraping, search, crawling, download |
| `audit-website` | global | SEO, broken links, meta tags |
| `powerpoint` | global | Presentaciones |
| `supabase-postgres-best-practices` | global | SQL avanzado (no crítico — usamos MySQL) |
| `go-testing` | OpenCode | Go tests (no usamos Go) |
| `skill-creator` | OpenCode | Crear skills nuevas |
| `skill-improver` | OpenCode | Mejorar skills existentes |

---

## 3. Protocolo de carga de skills

### Para el orquestador (yo mismo)

1. Antes de lanzar un sub-agente, leer `.atl/skill-registry.md`.
2. Identificar skills relevantes por contexto de la tarea (archivos que se van a tocar, tipo de trabajo).
3. Incluir paths exactos de `SKILL.md` en el prompt del sub-agente.

### Para sub-agentes

Al recibir `## Skills to load before work`, leer esos archivos antes de escribir/leer/revisar cualquier código.

### Ejemplo de prompt de sub-agente

```markdown
## Tarea
Crear el backend Express base con health endpoint.

## Skills to load before work
- /home/marcos/Escritorio/Kermingo/kermingo_menu/.agents/skills/kermingo-backend-api/SKILL.md
- /home/marcos/.agents/skills/nodejs-backend-patterns/SKILL.md
```

---

## 4. Mantenimiento

### Actualizar este archivo cuando

- Se instalen o remuevan skills del proyecto.
- Se detecte que una skill quedó obsoleta.
- Una skill global demuestre ser más útil de lo esperado (promocionar categoría).

### Comandos

```bash
# Refrescar el índice automático de skills
gentle-ai skill-registry refresh --force

# Listar skills del proyecto
npx skills list

# Buscar skills disponibles
npx skills find "testing"
```

### Scripts auxiliares

```bash
# Sincronizar skills locales del proyecto a .agents/skills/
bash scripts/sincronizar_skills_a_raiz.sh

# Instalar skills recomendadas (documentadas en docs/planificacion/24-SKILLS_SH_RECOMENDADAS.md)
bash scripts/instalar_skills_recomendadas.sh
```
