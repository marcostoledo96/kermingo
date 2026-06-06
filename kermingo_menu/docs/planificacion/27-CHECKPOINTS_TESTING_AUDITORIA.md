# 27 — Checkpoints de testing manual y auditoría con ChatGPT

Este documento agrega puntos de control obligatorios a la planificación de Kermingo.

La IA que trabaje en OpenCode debe avisar explícitamente cuando una etapa requiere:

1. verificación automática
2. testing manual por Marcos
3. auditoría externa con ChatGPT
4. aprobación antes de avanzar

## 1. Estados de checkpoint

Al terminar una etapa, responder siempre con este bloque:

```txt
## Checkpoint de etapa

Checkpoint automatico: completado / pendiente / fallido
Testing manual requerido: si / no
Auditoria con ChatGPT recomendada: si / no
Bloquea avance a siguiente etapa: si / no

Evidencia:
- comando ejecutado:
- resultado:
- archivos modificados:
- riesgos detectados:
- que debe revisar Marcos:
```

## 2. Cuándo hacer testing manual

El testing manual es obligatorio cuando:

- se crea o cambia una pantalla visible
- se cambia un flujo de usuario
- se modifica carrito
- se modifica checkout
- se modifica login
- se modifica admin
- se cambia estado de pedido/pago
- se toca stock
- se toca upload de comprobantes
- se toca deploy, CORS o cookies
- se toca diseño visual importante

## 3. Cuándo hacer auditoría con ChatGPT

La auditoría con ChatGPT es recomendada cuando termina una etapa grande o riesgosa:

- fin de setup general
- fin de base de datos
- fin de productos API
- fin de pedidos/stock
- fin de auth/cookies
- fin de frontend visual base
- fin de carrito/checkout
- fin de integración frontend-backend
- antes del primer deploy
- después del primer deploy
- antes de dar por cerrado el MVP
- antes de entregarlo al profesor

## 4. Qué debe pasarle Marcos a ChatGPT para auditoría

Cuando corresponda auditoría, pedirle a Marcos:

```txt
Generá un .zip del proyecto sin node_modules, .next, .env ni credenciales, y pasámelo para revisar.
```

Excluir:

```txt
node_modules/
.next/
.env
.env.local
backend/credentials/
drive-credentials.json
coverage/
dist/
```

Incluir:

```txt
backend/src/
backend/package.json
backend/.env.example
frontend/app/
frontend/components/
frontend/lib/
frontend/services/
frontend/types/
frontend/package.json
frontend/.env.local.example
docs/
AGENTS.md
openspec/ si se está usando
```

## 5. Checkpoints por etapa

### Etapa 0 — Exploración y estructura

Testing manual requerido: no.  
Auditoría con ChatGPT recomendada: sí, si hubo cambios en documentación o estructura.  
Bloquea avance: solo si hay contradicciones de carpetas.

Debe verificar:

- `frontend/` existe y es el frontend activo
- `diseno-de-landing-kermingo/` existe y es solo referencia
- `backend/` existe
- `AGENTS.md` no contradice esta estructura

### Etapa 1 — Setup backend completado

Testing manual requerido: sí, mínimo técnico.  
Auditoría con ChatGPT recomendada: sí.  
Bloquea avance: sí, si backend no levanta o docs contradicen estructura.

Testing manual:

```bash
cd backend
npm install
npm run dev
```

Abrir o probar:

```txt
GET http://localhost:<PUERTO>/api/health
```

Revisar:

- respuesta uniforme
- CORS básico
- separación app/server
- `.env.example`
- estructura MVC preparada

### Etapa 2 — Base de datos MySQL

Testing manual requerido: sí.  
Auditoría con ChatGPT recomendada: sí.  
Bloquea avance: sí.

Testing manual:

- correr `schema.sql` en MySQL local o Railway dev
- correr `seed.sql`
- verificar tablas
- verificar relaciones
- verificar índices
- verificar que no haya nombres en inglés innecesarios

Auditoría ChatGPT recomendada:

- revisar normalización
- relaciones muchos-a-muchos
- combos
- pedido_detalle
- stock
- constraints

### Etapa 3 — Productos API

Testing manual requerido: sí.  
Auditoría con ChatGPT recomendada: opcional pero recomendable.  
Bloquea avance: sí si endpoints no funcionan.

Testing manual:

- GET productos públicos
- GET producto por id
- POST producto admin
- PUT producto admin
- PATCH desactivar/recuperar
- PATCH stock

Herramientas:

- Postman
- Thunder Client
- curl
- frontend todavía no obligatorio

### Etapa 4 — Auth admin

Testing manual requerido: sí.  
Auditoría con ChatGPT recomendada: sí.  
Bloquea avance: sí.

Testing manual:

- login válido
- login inválido
- cookie httpOnly
- auth/me
- logout
- ruta protegida sin cookie
- ruta protegida con cookie

Revisar especialmente:

- CORS con credentials
- cookie local vs producción
- duración 24h
- no guardar token en localStorage

### Etapa 5 — Pedidos, stock y combos

Testing manual requerido: sí.  
Auditoría con ChatGPT recomendada: sí.  
Bloquea avance: sí.

Testing manual:

- crear pedido efectivo
- crear pedido transferencia con comprobante
- intentar transferencia sin comprobante
- stock baja
- stock insuficiente falla
- cancelar pedido repone stock
- combo descuenta productos internos
- pedido genera número KMG
- pedido genera token seguimiento

Esta etapa debe auditarse con ChatGPT antes de seguir, porque es el corazón del sistema.

### Etapa 6 — Frontend visual base en `frontend/`

Testing manual requerido: sí.  
Auditoría con ChatGPT recomendada: sí, con screenshots o zip.  
Bloquea avance: no siempre, salvo si rompe build.

Testing manual:

```bash
cd frontend
pnpm dev
pnpm lint
pnpm build
```

Revisar en navegador:

- landing
- menú
- carrito
- checkout
- ticket/confirmado
- seguimiento
- admin login
- dashboard
- productos
- pedidos
- caja
- cocina

Comparar visualmente con:

```txt
diseno-de-landing-kermingo/
```

No modificar la carpeta de referencia.

### Etapa 7 — Carrito y checkout conectados

Testing manual requerido: sí.  
Auditoría con ChatGPT recomendada: sí.  
Bloquea avance: sí.

Testing manual:

- agregar producto
- modificar cantidad
- persistencia localStorage
- recargar página
- ir a transferencia y volver
- efectivo oculta comprobante
- transferencia muestra comprobante
- errores visibles
- pedido exitoso limpia carrito

### Etapa 8 — Admin conectado

Testing manual requerido: sí.  
Auditoría con ChatGPT recomendada: sí.  
Bloquea avance: sí.

Testing manual:

- login admin
- crear producto
- editar producto
- desactivar/recuperar
- ajustar stock
- listar pedidos
- cambiar estado
- cancelar pedido
- validar pago

### Etapa 9 — Caja y cocina

Testing manual requerido: sí, idealmente con dos ventanas.  
Auditoría con ChatGPT recomendada: sí.  
Bloquea avance: sí.

Testing manual:

- abrir caja en una ventana
- abrir cocina en otra
- crear venta rápida efectivo
- confirmar que aparece en cocina
- cambiar a en preparación
- cambiar a listo
- cambiar a entregado
- verificar polling cada 10 segundos
- verificar productos pendientes agrupados

### Etapa 10 — Comprobantes y Drive

Testing manual requerido: sí.  
Auditoría con ChatGPT recomendada: sí.  
Bloquea avance: sí.

Testing manual:

- subir imagen comprobante
- subir PDF comprobante
- rechazar formato inválido
- ver comprobante desde admin
- aprobar/rechazar pago
- comprobar que archivos no quedan expuestos indebidamente

### Etapa 11 — Reportes Excel

Testing manual requerido: sí.  
Auditoría con ChatGPT recomendada: opcional.  
Bloquea avance: no si el MVP ya funciona, sí para entrega final.

Testing manual:

- descargar ventas.xlsx
- descargar productos-vendidos.xlsx
- descargar resumen.xlsx
- abrir archivos
- verificar totales
- verificar efectivo vs transferencia
- verificar que cancelados no suman

### Etapa 12 — Deploy

Testing manual requerido: sí.  
Auditoría con ChatGPT recomendada: sí.  
Bloquea avance: sí antes de evento/entrega.

Testing manual:

- Vercel frontend
- Railway backend
- Railway MySQL
- CORS producción
- cookies producción
- login producción
- compra producción
- comprobante producción
- Excel producción

## 6. Regla para no avanzar

No avanzar a la siguiente etapa si:

- fallan tests automáticos
- no se hizo testing manual obligatorio
- una auditoría recomendada encuentra errores críticos
- hay contradicción de carpetas (`frontend/` vs referencia)
- el build frontend falla
- backend no levanta
- hay riesgo de pérdida de stock/pedidos
