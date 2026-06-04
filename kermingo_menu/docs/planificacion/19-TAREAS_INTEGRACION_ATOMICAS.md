# 19 — Tareas integración atómicas

## I0 — Contrato API

### Tarea I0.1 — Documentar contratos

Archivos:

- `docs/api-contracts/productos.md`
- `docs/api-contracts/pedidos.md`
- `docs/api-contracts/auth.md`

Hacer:

- request/response exactos
- códigos HTTP
- errores esperados

Criterio:

- frontend y backend pueden trabajar en paralelo

## I1 — CORS y cookies

### Tarea I1.1 — Probar login local

Hacer:

- frontend localhost:3000
- backend localhost:3001
- cookie admin
- auth/me

Criterio:

- cookie viaja correctamente

### Tarea I1.2 — Probar login deploy

Hacer:

- Vercel → Railway
- SameSite None
- Secure
- credentials include

Criterio:

- admin loguea en producción

## I2 — Flujo compra real

### Tarea I2.1 — Compra efectivo

Hacer:

- agregar producto
- checkout efectivo
- crear pedido
- ver ticket
- ver admin
- ver cocina

Criterio:

- stock baja y pedido aparece

### Tarea I2.2 — Compra transferencia

Hacer:

- agregar producto
- checkout transferencia
- subir comprobante
- admin ve comprobante
- marcar pagado

Criterio:

- comprobante se guarda en Drive

## I3 — Caja rápida

### Tarea I3.1 — Venta presencial

Hacer:

- admin caja
- productos
- efectivo pagado
- pedido cocina

Criterio:

- venta queda registrada

## I4 — Cancelación y stock

### Tarea I4.1 — Cancelar pedido

Hacer:

- cancelar pedido
- verificar stock antes/después

Criterio:

- stock se repone
