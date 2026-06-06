# 19 — Tareas integración y deploy detalladas con checkpoints

## Leer antes

```txt
AGENTS.md
docs/planificacion/13-FLUJOS_FUNCIONALES.md
docs/planificacion/14-DEPLOY_RAILWAY_VERCEL.md
docs/planificacion/15-VARIABLES_ENTORNO.md
docs/planificacion/16-TESTING.md
docs/planificacion/27-CHECKPOINTS_TESTING_AUDITORIA.md
docs/planificacion/28-CHECKLIST_MANUAL_TESTING.md
```

## Estructura real

Frontend activo:

```txt
frontend/
```

Referencia visual, solo lectura:

```txt
diseno-de-landing-kermingo/
```

Backend:

```txt
backend/
```

Vercel root:

```txt
frontend
```

## Etapa I1 — Integración local frontend/backend

### Qué hacer

- Levantar backend.
- Levantar frontend.
- Configurar `NEXT_PUBLIC_API_URL`.
- Probar health desde frontend.
- Probar productos.
- Probar cookies si auth ya existe.

### Testing manual requerido

Sí.

### Auditoría con ChatGPT recomendada

Sí si hay problemas CORS/cookies.

## Etapa I2 — Flujo compra local

### Qué hacer

- Menú → carrito → checkout → pedido → seguimiento.
- Probar efectivo.
- Probar transferencia.
- Probar stock.
- Probar cancelación desde admin.

### Testing manual requerido

Sí, obligatorio.

### Auditoría con ChatGPT recomendada

Sí, obligatoria antes de deploy.

## Etapa I3 — Admin operativo local

### Qué hacer

- Login.
- Productos.
- Pedidos.
- Caja.
- Cocina.
- Comprobantes.
- Reportes.

### Testing manual requerido

Sí.

### Auditoría con ChatGPT recomendada

Sí.

## Etapa I4 — Deploy Railway backend

### Qué hacer

- Crear servicio Railway.
- Configurar variables.
- Conectar MySQL.
- Probar `/api/health`.
- Probar CORS con frontend local si corresponde.

### Testing manual requerido

Sí.

### Auditoría con ChatGPT recomendada

Sí si falla cookies/CORS.

## Etapa I5 — Deploy Vercel frontend

### Root Directory

Usar:

```txt
frontend
```

No usar:

```txt
diseno-de-landing-kermingo
```

### Qué hacer

- Configurar `NEXT_PUBLIC_API_URL`.
- Deploy.
- Probar landing.
- Probar API.
- Probar login.
- Probar compra.

### Testing manual requerido

Sí.

### Auditoría con ChatGPT recomendada

Sí, obligatoria antes de evento/entrega.

## Etapa I6 — Auditoría final MVP

Antes de considerar MVP cerrado:

- Pasar ZIP a ChatGPT.
- Ejecutar testing manual completo.
- Ejecutar tests automáticos.
- Verificar build frontend.
- Verificar backend.
- Verificar deploy.
- Verificar flujo evento real.

No cerrar MVP sin auditoría.
