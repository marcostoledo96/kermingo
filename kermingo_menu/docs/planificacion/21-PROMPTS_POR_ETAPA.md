# 21 — Prompts por etapa actualizados

## Regla inicial para todas las etapas

Antes de ejecutar cualquier etapa:

```txt
Leé AGENTS.md, docs/planificacion/00-INDICE-MAESTRO.md y docs/planificacion/27-CHECKPOINTS_TESTING_AUDITORIA.md.
Recordá que frontend/ es el frontend activo.
Recordá que diseno-de-landing-kermingo/ es solo referencia visual y no debe modificarse.
Al terminar, indicá testing manual y auditoría con ChatGPT si corresponde.
```

## Prompt — Checkpoint después de Etapa 1

```txt
Ya terminé la Etapa 1. Antes de avanzar, hacé una revisión de checkpoint.

Leé:
- AGENTS.md
- docs/planificacion/00-INDICE-MAESTRO.md
- docs/planificacion/27-CHECKPOINTS_TESTING_AUDITORIA.md
- docs/planificacion/17-TAREAS_BACKEND_DETALLADAS.md
- docs/planificacion/18-TAREAS_FRONTEND_DETALLADAS.md

Verificá:
- backend/ existe y levanta
- frontend/ es la carpeta activa
- diseno-de-landing-kermingo/ existe como referencia visual y no debe modificarse
- AGENTS.md no contradice la estructura real
- docs/planificacion está alineado
- scripts y skills están bien ubicados

No implementes nuevas funcionalidades. Devolvé:
- diagnóstico
- comandos de verificación
- testing manual requerido
- si conviene auditoría con ChatGPT
- si bloquea avanzar a Etapa 2
```

## Prompt — Etapa 2 Base de datos

```txt
Implementá la Etapa 2 de base de datos. Leé primero docs/planificacion/05-BASE_DE_DATOS_MYSQL.md y docs/planificacion/27-CHECKPOINTS_TESTING_AUDITORIA.md. Trabajá solo en backend/. No toques frontend/. No modifiques diseno-de-landing-kermingo/. Al terminar, indicá testing manual de schema/seed y si corresponde auditoría con ChatGPT.
```

## Prompt — Etapa frontend visual

```txt
Trabajá en frontend/. Antes de modificar una pantalla, comparala con su equivalente en diseno-de-landing-kermingo/, que es solo referencia visual. No modifiques la referencia. Mantené el diseño v0. Al terminar, ejecutá pnpm lint/build si es posible y avisá qué testing manual debo hacer.
```

## Prompt — Auditoría antes de avanzar

```txt
No implementes código. Revisá el estado actual de la etapa terminada y generá un informe para decidir si puedo avanzar. Indicá errores críticos, mejoras, testing manual pendiente, auditoría con ChatGPT recomendada y riesgos.
```
