# Prompt de inicio — Kermingo B6 (Caja, Cocina, Comprobantes, Reportes)

## Contexto del proyecto

Sos un agente IA trabajando en **Kermingo**, backend de un evento scout recaudatorio. El evento es el **20 de junio de 2026**. Stack: Node.js + Express + MySQL (mysql2/promise) + ESM + JWT en cookie httpOnly + bcrypt + Zod.

**Ubicación del proyecto**: `/home/marcos/Escritorio/Kermingo/kermingo_menu/`

**Documento de reglas operativas**: `AGENTS.md` (leer primero, sin excepción).

**Documentación de planificación**: `docs/planificacion/00-INDICE-MAESTRO.md` es el índice maestro. Los docs clave:
- `04-BACKEND_API_EXPRESS_MYSQL.md` — convenciones backend
- `05-BASE_DE_DATOS_MYSQL.md` — schema actual
- `06-ENDPOINTS_API.md` — endpoints definidos
- `13-FLUJOS_FUNCIONALES.md` — flujos de caja/cocina/comprobantes
- `17-TAREAS_BACKEND_DETALLADAS.md` — descripción de cada etapa
- `27-CHECKPOINTS_TESTING_AUDITORIA.md` — cuándo auditar y testear
- `28-CHECKLIST_MANUAL_TESTING.md` — checklist de testing manual
- `29-PROMPT_AUDITORIA_CHATGPT.md` — template de prompt para ChatGPT
- `33-AUDITORIA_B5_2_POST_SUBAGENTE_PLAN_REMEDIACION.md` — veredicto de ChatGPT 5.5 sobre B5.2 (contexto histórico)

**Reglas críticas no negociables** (de AGENTS.md y B5.2.1):
- Tablas y campos en español, singular, sin tildes.
- Endpoints en español.
- No implementar roles separados (un único nivel admin).
- Pago online: transferencia (con comprobante) o efectivo (sin comprobante).
- Caja rápida puede marcar ambos como pagados manualmente.
- Teléfono se guarda como VARCHAR con original y normalizado para WhatsApp.
- Carrito en localStorage (frontend, fuera de scope B6).
- Stock descuenta al confirmar, repone al cancelar.
- Promos descuentan componentes, no stock propio.
- Backend valida TODO aunque el frontend ya valide.
- NO usar EJS — React/Next.js para el frontend.

## Estado del proyecto al comenzar esta sesión

Último commit en main: **`bfe574c`** — "feat(backend): B5.2 + B5.2.1 — alineación schema/seed/promo/stock + remediación post-subagente"

**Etapas completadas y commiteadas**:
- B1: scaffolding Express + ESM
- B2: MySQL schema + pool
- B2.1: correcciones SQL post-auditoría
- B3: Productos API
- B4: Auth JWT (con `.strict()` Zod, login con `contrasenia` field, `requireAdmin`, `requireTrustedOrigin`)
- B5: Pedidos API (8 endpoints + caja rápida, transaccional, combos, stock, cancelación)
- B5.1: fixes de seguridad, validación y stock (post-auditoría)
- B5.2: alineación schema/seed/promo/numero de pedido/stock ilimitado
- B5.2.1: **remediación** de regresiones que introdujo un subagente (ver doc 33)

**B5.2.1 incluye 2 fixes críticos nuevos** que NO estaban en el subagente original:
- **RA-1**: `ORDER BY id` en SQL (no solo en JS) en los `SELECT ... FOR UPDATE` de `pedido.model.js` para reducir deadlocks
- **RA-4**: validación en `createWithTransaction` de que cada `promo` tenga componentes en `combo_producto` antes de expandir requerimientos; si no, lanza `Error('La promo "X" no tiene componentes configurados en combo_producto')`

**Estructura de OpenSpec activa**: `openspec/changes/backend-b5-2-schema-seed-alignment/` con artifacts de B5.2.1 (es el último cambio con SDD completo). Cambios previos en `openspec/changes/archive/`.

## Estado de la DB local

MariaDB 11.8.6 instalado y corriendo en `127.0.0.1:3306`. DB `kermingo` con charset `utf8mb4_unicode_ci`. Usuario `kermingo` / password `kermingo_dev`. Archivo `.env` del backend ya configurado con estos valores.

**Estado de la tienda**: está en `cerrada` por default. Para hacer testing manual de pedidos hay que correr `UPDATE configuracion_tienda SET estado='abierta' WHERE id=1;` antes. Volver a `cerrada` al terminar.

**B5.2.1 fue validado con testing manual real de punta a punta** (15/15 tests pasaron: health, login admin con `admin123`, /me, productos, tienda cerrada bloquea, producto ilimitado, promo descuenta componentes, cancelación repone stock, logout CSRF, promo huérfana rechazada). El backend está listo para B6.

## Tarea: Etapa B6 — Caja, Cocina, Comprobantes, Reportes

`docs/planificacion/17-TAREAS_BACKEND_DETALLADAS.md` define B6 así:

> ## Etapa B6 — Caja, cocina, comprobantes, reportes
> Seguir los endpoints definidos en `06-ENDPOINTS_API.md`.
> Cada módulo requiere testing manual y, si toca stock/pago/Drive, auditoría con ChatGPT.

B6 es la etapa más grande hasta ahora. Se sugiere dividir en sub-etapas:
- **B6.1** — Cocina: gestión de estados de pedido (`recibido → en_preparacion → listo → entregado`) y vista/listado de cocina
- **B6.2** — Caja rápida mejorada: marcar pedidos como pagados, integración con métodos de pago
- **B6.3** — Comprobantes: upload a Google Drive vía backend con Multer memoryStorage (ver `11-GOOGLE_DRIVE_ARCHIVOS.md`)
- **B6.4** — Reportes: Excel con resumen de ventas/stock/usuarios con ExcelJS

## Preflight SDD (decisiones ya tomadas)

- **Pace**: **A2 Automático** — correr fases back-to-back, parar solo en riesgo alto
- **Artefactos**: **B3 Ambos** — OpenSpec (archivos) + Engram (memoria)
- **PRs**: **C4 Auto** — decidir por tamaño del forecast
- **Review budget**: **D1 400 líneas**

## Lo que necesito de vos (la nueva sesión)

1. **Primero corré el preflight SDD y el init guard** del flujo (chequear que `sdd-init` esté hecho para `kermingo` en Engram; si no, correrlo).
2. **Después corré `/sdd-new backend-b6-caja-cocina-comprobantes-reportes`** (o el nombre que decidas) para arrancar el pipeline completo: `explore → propose → spec → design → tasks → apply → verify → archive`.
3. **Al llegar a `sdd-tasks`**, prestá atención al `Review Workload Forecast`. Si dice "Chained PRs recomendado: Sí" o supera 400 líneas, **ejecutá chained PRs desde el arranque** (C4 auto). Sub-etapas sugeridas: B6.1 cocina → B6.2 caja → B6.3 comprobantes → B6.4 reportes.
4. **Cada sub-etapa de B6 debe**:
   - Tener su propio `openspec/changes/backend-b6-X/`
   - Pasar testing manual real con DB local
   - Si toca stock, pagos, o Drive, pasar auditoría con ChatGPT (usar `29-PROMPT_AUDITORIA_CHATGPT.md` como template y guardar el resultado en `docs/planificacion/`)
5. **Comité cada sub-etapa por separado** (work unit commits, idealmente con PR).

## Convenciones de trabajo

- Metodología SDD completa: `explore → propose → spec → design → tasks → apply → verify → archive`.
- Cada artefacto SDD debe registrar su topic_key en Engram (formato: `sdd/{change-name}/{artifact}`).
- Modo: automático. Solo paro si el forecast es alto (>400 líneas) o hay decisión destructiva.
- No tocar frontend/ (B6 es solo backend).
- No tocar `diseno-de-landing-kermingo/` (referencia visual de solo lectura).
- Si el subagente introduce cambios no pedidos, revertir y re-aplicar selectivamente (lección aprendida en B5.2.1).
- Usar skills de `kermingo-backend-api` y `kermingo-verification` cuando sean relevantes (ver `docs/.agents/skills/`).
- Después de cada `sdd-apply`, correr `npm test` en el backend y validar con curl los endpoints nuevos.

## Para arrancar ahora

Decime "dale" o "arrancá" y empiezo con el preflight + init guard. Si querés cambiar el nombre del cambio, decímelo. Si querés que B6 se divida en otras sub-etapas distintas a las que propuse (B6.1 cocina, B6.2 caja, B6.3 comprobantes, B6.4 reportes), avisame antes de arrancar.
