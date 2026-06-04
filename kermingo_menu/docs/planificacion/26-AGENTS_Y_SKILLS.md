# 26 — Organización de agentes y skills

## Archivo principal

El archivo principal para agentes es:

```txt
AGENTS.md
```

Está en la raíz del proyecto y debe leerse siempre.

## Skills locales

Actualmente están en:

```txt
docs/.agents/skills/
```

Esto se hizo para mantener la documentación agrupada.

## Posible problema

Algunas herramientas esperan encontrar skills en la raíz:

```txt
.agents/skills/
```

Por eso se incluye un script para copiar las skills locales:

```bash
bash docs/scripts/sincronizar_skills_a_raiz.sh
```

## Cuándo sincronizar

Sincronizar cuando:

- OpenCode no detecte las skills.
- Se inicie una etapa importante.
- Se agreguen skills nuevas.

## Agentes sugeridos

### Agente backend

Lee:

```txt
AGENTS.md
docs/planificacion/04-BACKEND_API_EXPRESS_MYSQL.md
docs/planificacion/05-BASE_DE_DATOS_MYSQL.md
docs/planificacion/06-ENDPOINTS_API.md
docs/planificacion/17-TAREAS_BACKEND_DETALLADAS.md
```

### Agente frontend

Lee:

```txt
AGENTS.md
docs/planificacion/25-REFERENCIA_VISUAL_FRONTEND.md
docs/planificacion/07-FRONTEND_NEXTJS_V0.md
docs/planificacion/12-DISENO_VISUAL_V0.md
docs/planificacion/18-TAREAS_FRONTEND_DETALLADAS.md
```

### Agente integración

Lee:

```txt
AGENTS.md
docs/planificacion/09-AUTH_COOKIES_CORS.md
docs/planificacion/13-FLUJOS_FUNCIONALES.md
docs/planificacion/19-TAREAS_INTEGRACION_DEPLOY_DETALLADAS.md
```

### Agente QA

Lee:

```txt
AGENTS.md
docs/planificacion/16-TESTING.md
docs/planificacion/19-TAREAS_INTEGRACION_DEPLOY_DETALLADAS.md
```

## Regla de documentación

Después de cada tarea importante, actualizar:

```txt
docs/docs/changelog-ia.md
docs/docs/estado-actual.md
docs/docs/mapa-archivos.md
```
