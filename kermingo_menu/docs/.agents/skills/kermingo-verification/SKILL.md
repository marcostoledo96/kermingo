---
name: kermingo-verification
description: Usar antes de cerrar cualquier tarea de Kermingo para verificar build, tests, flujo y documentación.
---

# Kermingo Verification Skill

## Regla central

No afirmar que algo está listo sin evidencia recién ejecutada.

## Backend

Ejecutar según corresponda:

```bash
cd backend
npm test
npm run dev
curl http://localhost:3001/api/health
```

## Frontend

Ejecutar según corresponda:

```bash
cd frontend
pnpm lint
pnpm build
pnpm test
```

## Integración crítica

Verificar manualmente o por E2E:

- compra efectivo online
- compra transferencia con comprobante
- login admin
- caja rápida
- cocina
- cancelación con reposición de stock

## Documentación

Actualizar si cambió arquitectura, endpoints, rutas o archivos:

```txt
docs/estado-actual.md
docs/changelog-ia.md
docs/mapa-archivos.md
```
