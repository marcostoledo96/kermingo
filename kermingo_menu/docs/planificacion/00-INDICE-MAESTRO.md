# 00 — Índice maestro Kermingo

## Estructura real del proyecto

La estructura actual que debe respetarse es:

```txt
/home/marcos/Escritorio/Kermingo/kermingo_menu/
├── AGENTS.md
├── backend/                         # Backend activo: Express + MySQL + API REST
├── frontend/                        # Frontend activo: Next.js + React + TypeScript + TailwindCSS
├── diseno-de-landing-kermingo/       # Referencia visual v0, solo lectura
├── docs/
│   └── planificacion/
├── scripts/
├── openspec/
└── .agents/
```

## Regla crítica

El frontend activo es:

```txt
frontend/
```

La carpeta:

```txt
diseno-de-landing-kermingo/
```

es **solo referencia visual**. No se modifica.

## Qué leer según la tarea

### Siempre

1. `AGENTS.md`
2. `docs/planificacion/00-INDICE-MAESTRO.md`
3. `docs/planificacion/27-CHECKPOINTS_TESTING_AUDITORIA.md`

### Para backend

1. `04-BACKEND_API_EXPRESS_MYSQL.md`
2. `05-BASE_DE_DATOS_MYSQL.md`
3. `06-ENDPOINTS_API.md`
4. `09-AUTH_COOKIES_CORS.md`
5. `11-GOOGLE_DRIVE_ARCHIVOS.md`
6. `17-TAREAS_BACKEND_DETALLADAS.md`

### Para frontend

1. `07-FRONTEND_NEXTJS_V0.md`
2. `08-RUTAS_FRONTEND.md`
3. `10-CARRITO_LOCALSTORAGE.md`
4. `12-DISENO_VISUAL_V0.md`
5. `18-TAREAS_FRONTEND_DETALLADAS.md`
6. `25-REFERENCIA_VISUAL_FRONTEND.md`

### Para integración, testing y auditoría

1. `13-FLUJOS_FUNCIONALES.md`
2. `16-TESTING.md`
3. `19-TAREAS_INTEGRACION_DEPLOY_DETALLADAS.md`
4. `27-CHECKPOINTS_TESTING_AUDITORIA.md`
5. `28-CHECKLIST_MANUAL_TESTING.md`
6. `29-PROMPT_AUDITORIA_CHATGPT.md`

## Checkpoints obligatorios

Desde ahora la planificación incluye checkpoints explícitos donde la IA debe avisar:

- cuándo ejecutar testing manual
- cuándo conviene pasarle el ZIP a ChatGPT para auditoría externa
- cuándo no avanzar a la siguiente etapa sin confirmación de Marcos

Los checkpoints están definidos en:

```txt
docs/planificacion/27-CHECKPOINTS_TESTING_AUDITORIA.md
```

## Estado actual reportado

Marcos indicó que ya terminó la **Etapa 1** y quiere agregar avisos de testing manual y auditoría con ChatGPT antes de seguir avanzando.
