# 35 — Auditoría B6.2 Caja pendiente (para ChatGPT)

> Estado: **pendiente de auditoría externa**. Este archivo no contiene un veredicto de ChatGPT; contiene el paquete listo para pedirlo.

## Alcance auditado

Etapa: **B6.2 — Caja**

Slices encadenadas:
- PR 1: `feature/backend-b6-2-caja` — pagos y filtro de pendientes
- PR 2: `feature/backend-b6-2-caja-edicion` — edición transaccional de pedidos

PRs abiertas:
- PR 3: <https://github.com/marcostoledo96/kermingo/pull/3>
- PR 4: <https://github.com/marcostoledo96/kermingo/pull/4>

Base de la cadena:
- `feature/backend-b6-1-configuracion`

## Qué se implementó en B6.2

### PR 1 — pagos y filtro
- Máquina explícita de estados de pago:
  - `pendiente -> pagado | comprobante_subido`
  - `comprobante_subido -> pagado | rechazado`
  - `rechazado -> pendiente`
  - `pagado` terminal
- `PATCH /api/admin/pedidos/:id/pago` ahora valida transiciones y rechaza backward transitions inválidas.
- `GET /api/admin/pedidos?solo_pagos_pendientes=true` ahora:
  - incluye `pendiente` y `rechazado`
  - excluye `pagado`
  - excluye `estado_pedido='cancelado'`

### PR 2 — edición transaccional
- `PUT /api/admin/pedidos/:id`
- Solo editable si:
  - el pedido existe
  - `origen='caja'`
  - `estado_pedido` no es `cancelado` ni `entregado`
- Reconciliación transaccional:
  - restaura stock anterior
  - calcula requerimientos nuevos
  - bloquea filas de producto en orden determinista con `FOR UPDATE`
  - valida stock con reposición aplicada
  - aplica delta neto
  - reescribe `pedido_detalle`
  - recalcula `total`
- Compatible con productos limitados, ilimitados y promos/combos.

## Archivos clave tocados

- `backend/src/api/models/pedido.model.js`
- `backend/src/api/controllers/pedido.controller.js`
- `backend/src/api/routes/pedido.routes.js`
- `backend/src/api/schemas/pedido.schema.js`
- `backend/tests/caja.test.js`
- `openspec/changes/backend-b6-2-caja/*`

## Evidencia local ya verificada

### Tests
- `npm test` → **44/44 pass**
- Suite focalizada PR1 caja → **24/24 pass**
- Suite focalizada PR2 edit → **9/9 pass**

### Runtime manual / DB local
Verificado localmente con servidor + MariaDB:
- `pendiente -> pagado` para efectivo: **200**
- `pendiente -> pagado` para transferencia sin comprobante: **200**
- `pagado -> pendiente`: **400**
- `solo_pagos_pendientes=true` devuelve solo items accionables y excluye cancelados
- `PUT /api/admin/pedidos/:id` exitoso recalcula total y reconcilia stock
- `PUT` con stock insuficiente devuelve **409** y hace rollback
- `PATCH /pago` no cambia stock

## Warnings conocidos antes de auditar

- `backend/tests/caja.test.js` usa fixtures con prefijo amplio `TEST-B6-2%`, no ideal para corridas concurrentes.
- Hay warning de lifecycle/open handles en Jest por el pool MySQL compartido en tests DB-backed.
- El audit externo debería revisar si la política de transiciones de `estado_pago` quedó bien pensada para caja + futuros comprobantes.

## Prompt listo para ChatGPT

Usá como base `docs/planificacion/29-PROMPT_AUDITORIA_CHATGPT.md` + este agregado específico:

```txt
Auditá especialmente la etapa B6.2 de backend (caja), que ya tiene dos PRs encadenadas:
- PR 1: pagos y filtro de pendientes
- PR 2: edición transaccional de pedidos con reconciliación de stock

Quiero que revises especialmente:
1. Si la máquina de estados de pago es correcta y consistente con el MVP.
2. Si el flujo de caja rápida está bien resuelto para efectivo y transferencia sin comprobante.
3. Si el filtro `solo_pagos_pendientes` está bien definido o debería considerar más estados/campos.
4. Si la edición transaccional de pedidos tiene riesgos de sobreventa, race conditions o rollback incompleto.
5. Si el manejo de combos/promos al editar pedidos es seguro.
6. Si hay bugs sutiles en stock limitado vs ilimitado.
7. Si la API debería impedir otras transiciones de `estado_pago` o permitir algunas adicionales.
8. Si los tests actuales son suficientes o qué cobertura crítica falta.
9. Si detectás deuda técnica que convenga resolver antes de B6.3 (comprobantes/Drive).

Evidencia local ya observada:
- `npm test`: 44/44 pass
- PATCH pago efectivo pendiente -> pagado: 200
- PATCH pago transferencia pendiente -> pagado: 200
- PATCH pago pagado -> pendiente: 400
- GET admin pedidos con `solo_pagos_pendientes=true`: excluye cancelados y pagados
- PUT editar pedido de caja: 200 con recalculo de total y stock
- PUT con stock insuficiente: 409 con rollback

Formato de respuesta pedido:
- Resumen ejecutivo
- Errores críticos
- Errores importantes
- Mejoras recomendadas
- Buenas decisiones detectadas
- Checklist de corrección
- Riesgos para seguir con B6.3
```

## Resultado externo

Pendiente de completar por Marcos luego de correr la auditoría en ChatGPT.
