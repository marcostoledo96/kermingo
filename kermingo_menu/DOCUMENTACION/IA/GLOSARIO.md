# Glosario — Kermingo

> Términos del dominio del sistema. Si un término técnico no está aquí,
> revisá el archivo específico en `DOCUMENTACION/IA/`.

---

| Término | Definición |
|---|---|
| **Kermingo** | Nombre del evento y del sistema. Kermesse + bingo del Grupo Scout San Patricio. |
| **KMG-XXXX** | Número legible de pedido. Formato `KMG-` + 4 dígitos con pad cero (ej: `KMG-0001`). Se genera después del INSERT usando el `insertId`. |
| **Caja rápida** | Flujo donde el admin crea un pedido directamente desde el panel. Puede setear `estado_pago` y `estado_pedido` iniciales. Origen: `'caja'`. |
| **Cocina** | Vista del admin optimizada para ver y avanzar pedidos. Ordena por prioridad: `recibido` → `en_preparacion` → `listo`. |
| **Combo / Promo** | Producto de tipo `'promo'` que se compone de otros productos. No tiene stock propio; su disponibilidad depende del stock de sus componentes en `combo_producto`. |
| **stock_limitado** | Flag `TINYINT(1)` en `producto`. `1` = el producto tiene stock contable. `0` = ilimitado (como agua, mate cocido). |
| **token de seguimiento** | String hexadecimal aleatorio de 32 bytes que se genera al crear un pedido. Permite al visitante ver el estado de su pedido sin login. |
| **comprobante** | Archivo adjunto que prueba el pago por transferencia. Implementado en B6.3: se sube a Google Drive via `POST /api/pedidos` (multipart) y se registra en `archivo_drive`. |
| **RUN_ID** | Identificador único (`Date.now()`) usado en tests de integración para aislar datos entre ejecuciones. |
| **solo_pagos_pendientes** | Filtro del admin para ver pedidos con `estado_pago = 'pendiente'`. Permite identificar rápidamente pedidos que requieren verificación de pago. |
| **origin / referer** | Headers HTTP que el middleware `requireTrustedOrigin` usa para validar CSRF. Si `origin` o `referer` coinciden con `FRONTEND_URL`, se permite la request. |
| **trusted origin** | Origen confiable definido por `FRONTEND_URL`. Solo requests desde este origen pueden hacer POST/PUT/PATCH/DELETE protegidos. |
| **CSRF** | Cross-Site Request Forgery. Mitigado por `requireTrustedOrigin` que verifica que el origin coincide con `FRONTEND_URL`. |
| **idempotencia** | Propiedad donde repetir la misma operación produce el mismo resultado. Los `UPDATE` de stock son idempotentes si el valor no cambia, pero `affectedRows` devuelve 0 (ver `GOTCHAS.md` sección 3). |
| **affectedRows** | Campo devuelto por `mysql2` en operaciones `UPDATE/DELETE`. Cuenta filas **MODIFICADAS**, no filas **MATCHED**. Un UPDATE que no cambia valores devuelve `0`. |
| **cancelWithTransaction** | Función del modelo `pedido.model.js` que cancela un pedido y repone todo el stock dentro de una transacción MySQL con `FOR UPDATE` determinístico. |
| **singleton de configuración** | La tabla `configuracion_tienda` siempre tiene `id = 1`. No hay múltiples registros de configuración. |
| **Soft delete** | Productos desactivados (`activo = 0`) en lugar de eliminados. Se restauran con `activo = 1`. |
| **Snapshot de precio** | Al crear un `pedido_detalle`, se guarda el precio unitario actual del producto. Si el precio cambia después, el detalle mantiene el precio original. |
| **ESM** | ECMAScript Modules. El proyecto usa `"type": "module"` en `package.json`, lo que requiere imports con extensión `.js` y `jest --experimental-vm-modules`. |
| **FOR UPDATE determinístico** | Patrón donde los locks en transacciones se adquieren en orden de ID ascendente para evitar deadlocks entre transacciones concurrentes. |
| **normalizarTelefono** | Función que convierte números de teléfono a formato WhatsApp (`549...`). Ver `CORE.md` sección 6. |
| **Frontend URL** | URL del frontend configurada en `FRONTEND_URL`. Usada para CORS y validación CSRF. Default: `http://localhost:3000`. |
| **estado_pedido** | ENUM de MySQL con valores: `recibido`, `en_preparacion`, `listo`, `entregado`, `cancelado`. Ver `CORE.md` sección 1. |
| **estado_pago** | ENUM de MySQL con valores: `pendiente`, `comprobante_subido`, `pagado`, `rechazado`. Ver `CORE.md` sección 2. |
| **origen** | ENUM de MySQL en `pedido`: `'online'` (pedido del visitante) o `'caja'` (pedido creado por admin). Determina permisos de edición. |
| **metodo_pago** | ENUM de MySQL: `'transferencia'` o `'efectivo'`. Online permite solo transferencia con comprobante; caja permite ambos. |
| **respuestaExitosa** | Utilidad en `respuesta.utils.js` que formatea respuestas como `{ ok: true, data, message }`. |
| **respuestaError** | Utilidad en `respuesta.utils.js` que formatea errores como `{ ok: false, error }`. En dev incluye `stack`. |
| **AppError** | Clase base de errores personalizados en `errors.js`. Tiene `statusCode` y `esOperacional`. |
| **ValidationError** | Subclase de `AppError` con status 400. Usada para errores de validación Zod y lógica de negocio. |
| **AuthError** | Subclase de `AppError` con status 401. Usada para token ausente/inválido, cuenta inactiva, origen no permitido. |
| **NotFoundError** | Subclase de `AppError` con status 404. Usada cuando un recurso no existe. |
| **InsufficientStockError** | Subclase de `AppError` con status 409. Usada cuando no hay stock suficiente para crear un pedido. |
| **disponible_desde** | Campo `TIME` en `producto` que indica desde qué hora se habilita el producto (ej: cena a partir de las 20:00). Puede ser `NULL`. |
| **cena_habilitada_desde** | Campo `TIME` en `configuracion_tienda` que indica desde qué hora se habilita la cena en general. `NULL` = sin restricción. |
