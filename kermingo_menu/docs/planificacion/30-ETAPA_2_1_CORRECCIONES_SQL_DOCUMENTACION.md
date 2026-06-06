# 30 — Etapa 2.1: Correcciones SQL y documentación antes de Productos API

## Objetivo

Este documento define una etapa corta de corrección antes de avanzar a **Etapa 3 — Productos API**.

La auditoría de la Etapa 2 confirmó que la base de datos está bien encaminada, pero hay ajustes que conviene realizar ahora para evitar problemas futuros en productos, pedidos, stock, combos/promos, modo demo y auditorías.

## Estado actual conocido

Ya está completado:

- **Etapa 1 — Backend Base**
  - Express ESM
  - `GET /api/health`
  - respuestas uniformes
  - config centralizada
  - error handler global
  - OpenSpec inicializado

- **Etapa 2 — MySQL Schema + Pool**
  - `mysql2/promise`
  - pool lazy
  - `schema.sql`
  - `seed.sql`
  - 9 tablas base
  - seed ejecutado en MySQL Docker
  - conexión desde Node verificada
  - 24 productos cargados

## Regla de estructura del proyecto

La estructura real debe respetarse:

```txt
/home/marcos/Escritorio/Kermingo/kermingo_menu/
├── backend/                         # backend activo
├── frontend/                        # frontend activo Next.js
├── diseno-de-landing-kermingo/       # referencia visual v0, solo lectura
├── docs/
├── openspec/
└── .agents/
```

## Regla crítica

No modificar:

```txt
diseno-de-landing-kermingo/
```

No trabajar en frontend en esta etapa, salvo que sea estrictamente necesario para actualizar documentación o dejar constancia de compatibilidad de tipos. Esta etapa es principalmente de backend, SQL, OpenSpec y documentación.

---

# Decisiones funcionales confirmadas por Marcos

## 1. Promos/combos sin stock propio

Las promos/combos **no tendrán stock propio**.

Su disponibilidad se calcula automáticamente a partir del stock de sus componentes internos.

Ejemplo:

```txt
Promo Merienda
- 1 medialuna
- 1 chocolatada
```

Si hay:

```txt
medialunas disponibles = 10
chocolatadas disponibles = 5
```

La promo puede venderse como máximo 5 veces.

## Decisión técnica

Los productos de tipo promo deben quedar así:

```sql
stock_limitado = 0
stock_actual = NULL
```

La disponibilidad se calculará en futuras etapas usando la tabla de componentes.

## 2. Modo demo sin uso de base de datos para pedidos reales

Cuando se habilite el modo demo, la base de datos debe quedar sin uso para compras/pedidos reales.

El modo demo se usará para mostrar el proyecto en portfolio, no para generar ventas reales.

## Decisión técnica

No agregar por ahora `pedido.modo`.

La tabla `configuracion_tienda` mantiene:

```sql
estado ENUM('abierta','cerrada','demo')
```

Regla futura:

```txt
estado = abierta  → permite pedidos reales
estado = cerrada  → no permite crear pedidos
estado = demo     → frontend usa flujo demo/mock y no crea pedidos reales en la base
```

El backend, cuando implemente creación de pedidos, debe rechazar pedidos reales si la tienda no está `abierta`.

## 3. Número de pedido basado en ID

El número visible debe tener formato:

```txt
KMG-0001
KMG-0002
KMG-0003
```

## Decisión técnica

Para evitar race condition:

1. Insertar pedido con `numero = NULL`.
2. Obtener `insertId`.
3. Generar número usando el ID.
4. Actualizar el pedido dentro de la misma transacción.

Por eso `pedido.numero` debe permitir `NULL` inicialmente, manteniendo índice `UNIQUE`.

Recomendado:

```sql
numero VARCHAR(20) NULL UNIQUE
```

MySQL permite múltiples `NULL` en un índice `UNIQUE`.

## 4. Usar `promo`, no `combo`, como tipo de producto

Marcos prefiere que el tipo sea:

```txt
promo
```

No:

```txt
combo
```

## Decisión técnica

El campo `producto.tipo` debe usar:

```sql
ENUM('comida','bebida','promo')
```

La tabla `combo_producto` puede mantenerse por ahora como nombre técnico ya planificado, pero debe documentarse que representa la composición interna de productos tipo `promo`.

Alternativa futura opcional:

```txt
combo_producto → promo_producto
```

No se recomienda renombrar ahora si ya hay documentación y seed usando `combo_producto`, salvo que el código todavía esté lo suficientemente temprano y OpenCode proponga hacerlo de forma ordenada.

## 5. Pizza sin TACC y Helados palito deben arrancar agotados

En el seed inicial deben arrancar con:

```sql
stock_actual = 0
```

Productos:

```txt
Pizza sin TACC
Helados palito
```

Deben mostrarse como agotados cuando el frontend consuma la API.

---

# Correcciones obligatorias antes de avanzar

## Corrección 1 — Idempotencia de índices

Problema detectado:

Las tablas usan `CREATE TABLE IF NOT EXISTS`, pero los índices usan:

```sql
CREATE INDEX idx_producto_activo ON producto(activo);
```

Eso puede fallar si se vuelve a ejecutar `schema.sql`.

## Qué corregir

Hacer que la creación de índices sea idempotente o separar claramente la ejecución de índices.

Opciones aceptables:

### Opción recomendada

Crear un helper SQL condicional usando `information_schema.statistics` para cada índice.

### Opción alternativa aceptable

Crear archivo separado:

```txt
backend/src/api/database/indexes.sql
```

y documentar que se ejecuta después de `schema.sql`, una sola vez o de forma controlada.

### Opción no recomendada

Dejar índices duplicables sin documentación.

## Criterio de aceptación

Re-ejecutar `schema.sql` no debe romper por índices duplicados, o debe existir documentación clara y un archivo de índices separado con ejecución controlada.

---

## Corrección 2 — `pedido.numero` nullable inicialmente

Problema detectado:

Actualmente puede estar como:

```sql
numero VARCHAR(20) NOT NULL UNIQUE
```

Eso complica la estrategia segura de generación `KMG-0001` basada en `insertId`.

## Qué corregir

Cambiar a:

```sql
numero VARCHAR(20) NULL UNIQUE
```

Documentar que en la etapa de Pedidos:

1. se inserta pedido con `numero = NULL`
2. se obtiene `insertId`
3. se genera `KMG-${id}`
4. se actualiza el pedido dentro de la misma transacción

## Criterio de aceptación

El schema debe permitir insertar un pedido inicial sin número y luego actualizarlo con número único.

---

## Corrección 3 — Promos sin stock propio

Problema detectado:

Los productos de tipo promo/combo no deben tener stock propio si se calculan por componentes.

## Qué corregir

En `seed.sql`, para productos tipo `promo`:

```sql
stock_limitado = 0
stock_actual = NULL
```

La tabla `combo_producto` debe definir los componentes internos.

## Criterio de aceptación

Las promos no dependen de su propio `stock_actual`. Su disponibilidad queda preparada para calcularse por componentes en etapas posteriores.

---

## Corrección 4 — Usar `promo` como tipo

Problema detectado:

Puede existir diferencia entre frontend y backend:

```txt
frontend: promo
backend: combo
```

## Qué corregir

Unificar `producto.tipo` a:

```sql
ENUM('comida','bebida','promo')
```

Actualizar `seed.sql` para que las promos usen:

```sql
tipo = 'promo'
```

Actualizar documentación correspondiente si menciona `combo` como valor del enum.

## Criterio de aceptación

No debe existir contradicción entre frontend, seed y schema sobre el tipo de producto.

---

## Corrección 5 — Seed con productos agotados

## Qué corregir

En `seed.sql`, dejar agotados:

```txt
Pizza sin TACC
Helados palito
```

Con:

```sql
stock_limitado = 1
stock_actual = 0
```

## Criterio de aceptación

Al consultar productos en futuras etapas, esos productos podrán mostrarse como `Agotado`.

---

## Corrección 6 — Modo demo sin pedidos reales

## Qué corregir

No agregar `pedido.modo` por ahora.

Actualizar documentación para aclarar:

```txt
configuracion_tienda.estado = demo
```

significa:

- frontend puede operar con mocks/demo
- backend no debe crear pedidos reales
- reportes reales no deben incluir datos demo porque no habrá datos demo guardados

## Criterio de aceptación

La documentación debe dejar claro que modo demo no usa la base para crear pedidos.

---

## Corrección 7 — ZIP de auditoría sin `.env`

Problema detectado:

El ZIP de auditoría anterior incluyó:

```txt
backend/.env
```

## Qué corregir

Revisar:

```txt
scripts/crear_zip_auditoria.sh
```

Asegurar que excluya:

```txt
.env
.env.local
backend/.env
frontend/.env.local
credentials/
drive-credentials.json
node_modules/
.next/
coverage/
dist/
```

## Criterio de aceptación

El ZIP generado para auditoría no debe incluir credenciales ni variables sensibles.

---

# Mejoras recomendadas en esta etapa

Estas mejoras no son todas bloqueantes, pero conviene hacerlas ahora si el cambio es simple.

## Mejora 1 — Constraints de valores no negativos

Agregar `CHECK` constraints si la versión de MySQL lo soporta.

Campos recomendados:

```txt
producto.precio >= 0
producto.stock_actual >= 0 o NULL
producto.stock_minimo_alerta >= 0
combo_producto.cantidad > 0
pedido.total >= 0
pedido_detalle.cantidad > 0
pedido_detalle.precio_unitario >= 0
pedido_detalle.subtotal >= 0
archivo_drive.tamanio_bytes > 0
```

Ejemplo:

```sql
CONSTRAINT chk_producto_precio CHECK (precio >= 0)
```

## Mejora 2 — Constraint parcial pago/comprobante

Agregar una restricción para impedir comprobante en efectivo:

```sql
CONSTRAINT chk_pedido_comprobante_efectivo CHECK (
  metodo_pago <> 'efectivo' OR comprobante_archivo_id IS NULL
)
```

No hacer obligatorio el comprobante para toda transferencia en DB, porque caja rápida puede marcar transferencia como pagada sin comprobante en ciertos casos.

Esa regla se valida mejor en backend según `origen`.

## Mejora 3 — Índices adicionales

Agregar si no existen:

```sql
idx_producto_categoria_categoria
```

sobre:

```sql
producto_categoria(categoria_id, producto_id)
```

Agregar:

```sql
idx_pedido_detalle_pedido
```

sobre:

```sql
pedido_detalle(pedido_id)
```

Opcional:

```sql
idx_pedido_estado_created
idx_pedido_pago_created
```

para listados admin.

## Mejora 4 — Charset/collation explícito

La base tiene textos con acentos.

Recomendado al crear base:

```sql
CREATE DATABASE kermingo
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;
```

Y/o definir en tablas:

```sql
DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
```

---

# Archivos a revisar/modificar

## Backend

```txt
backend/src/api/database/schema.sql
backend/src/api/database/seed.sql
backend/src/api/database/db.js
backend/src/api/config/environments.js
backend/.env.example
backend/package.json
```

## Scripts

```txt
scripts/crear_zip_auditoria.sh
```

## Documentación

Actualizar si existen:

```txt
docs/planificacion/05-BASE_DE_DATOS_MYSQL.md
docs/planificacion/13-FLUJOS_FUNCIONALES.md
docs/planificacion/17-TAREAS_BACKEND_DETALLADAS.md
docs/planificacion/27-CHECKPOINTS_TESTING_AUDITORIA.md
docs/estado-actual.md
docs/mapa-archivos.md
docs/changelog-ia.md
```

Si existe esta ruta duplicada, también revisar y corregir:

```txt
docs/docs/estado-actual.md
docs/docs/mapa-archivos.md
```

## OpenSpec

Crear o actualizar un cambio:

```txt
openspec/changes/mysql-schema-pool-fixes/
```

o nombre equivalente según convención actual.

Debe incluir:

```txt
proposal.md
design.md
tasks.md
verify-report.md
specs/
```

---

# Prompt recomendado para OpenCode

Copiar y pegar este prompt para ejecutar la Etapa 2.1.

```txt
Continuemos con Kermingo. Ya completamos Etapa 1 Backend Base y Etapa 2 MySQL Schema + Pool. Después de auditoría externa, necesitamos hacer una etapa corta de correcciones antes de avanzar a Productos API.

# Etapa 2.1 — Correcciones SQL, seed y documentación

Trabajá con metodología SDD usando Gentle AI.

No avances a Productos API, Auth, Pedidos, Frontend ni Google Drive.

## Objetivo

Corregir y documentar decisiones de base de datos detectadas en auditoría:

1. idempotencia de índices
2. pedido.numero nullable para generación segura KMG basada en insertId
3. promos sin stock propio
4. usar tipo `promo` en vez de `combo`
5. Pizza sin TACC y Helados palito agotados en seed
6. modo demo sin guardar pedidos reales en DB
7. ZIP de auditoría sin `.env`
8. actualizar documentación viva y OpenSpec

## Leer antes

Leé en este orden:

- AGENTS.md
- docs/planificacion/00-INDICE-MAESTRO.md
- docs/planificacion/05-BASE_DE_DATOS_MYSQL.md
- docs/planificacion/13-FLUJOS_FUNCIONALES.md
- docs/planificacion/17-TAREAS_BACKEND_DETALLADAS.md
- docs/planificacion/27-CHECKPOINTS_TESTING_AUDITORIA.md
- docs/planificacion/28-CHECKLIST_MANUAL_TESTING.md
- docs/planificacion/29-PROMPT_AUDITORIA_CHATGPT.md
- este documento: docs/planificacion/30-ETAPA_2_1_CORRECCIONES_SQL_DOCUMENTACION.md

También revisá:

- openspec/
- .agents/skills/
- scripts/crear_zip_auditoria.sh

## Reglas de estructura

- backend/ es el backend activo.
- frontend/ es el frontend activo, pero NO se toca en esta etapa.
- diseno-de-landing-kermingo/ es solo referencia visual y NO se modifica.
- docs/ contiene la planificación viva.
- openspec/ debe actualizarse si corresponde.

## Decisiones confirmadas por Marcos

- Las promos se calculan por componentes, no tienen stock propio.
- Modo demo no guarda pedidos reales en base.
- Número de pedido debe ser KMG-0001 basado en ID.
- Usar `promo` como tipo de producto, no `combo`.
- Pizza sin TACC y Helados palito arrancan agotados.

## Cambios requeridos

### 1. schema.sql

Ajustar:

- `pedido.numero` debe ser `VARCHAR(20) NULL UNIQUE`.
- `producto.tipo` debe ser `ENUM('comida','bebida','promo')`.
- índices deben ser idempotentes o estar separados/documentados correctamente.
- agregar índices recomendados:
  - `idx_producto_categoria_categoria`
  - `idx_pedido_detalle_pedido`
- agregar constraints no negativos si MySQL lo soporta y no complica demasiado.
- agregar constraint para evitar comprobante en efectivo si es viable:
  - efectivo → comprobante_archivo_id debe ser NULL.

### 2. seed.sql

Ajustar:

- productos tipo promo con `tipo = 'promo'`.
- promos con `stock_limitado = 0` y `stock_actual = NULL`.
- Pizza sin TACC con `stock_actual = 0`.
- Helados palito con `stock_actual = 0`.
- mantener componentes en `combo_producto`.

### 3. documentación

Actualizar:

- base de datos
- flujos funcionales
- tareas backend
- checkpoints
- estado actual
- mapa de archivos
- changelog IA

Debe quedar claro que `combo_producto` representa la composición técnica de productos tipo `promo`.

### 4. script de auditoría

Revisar `scripts/crear_zip_auditoria.sh`.

Asegurar que excluye:

- .env
- .env.local
- backend/.env
- frontend/.env.local
- credentials/
- drive-credentials.json
- node_modules/
- .next/
- coverage/
- dist/

### 5. OpenSpec

Crear o actualizar cambio:

- `mysql-schema-pool-fixes`

Debe incluir proposal, design, tasks, verify-report y specs si corresponde.

## Verificación esperada

Ejecutar si es posible:

```bash
cd backend
npm run dev
curl http://localhost:3001/api/health
```

Validar que el backend sigue funcionando.

Si hay MySQL Docker disponible:

1. recrear base o aplicar schema corregido
2. correr seed
3. verificar que hay 24 productos
4. verificar que Pizza sin TACC y Helados palito tienen stock 0
5. verificar que promos tienen stock NULL y stock_limitado 0
6. verificar que tipo usa `promo`
7. verificar que índices no rompen si se re-ejecuta lo documentado
8. verificar relaciones de combo_producto

Si no se puede probar MySQL, dejarlo explícito como pendiente, sin inventar resultados.

## Resultado esperado final

Responder con:

```txt
## Resultado Etapa 2.1 — Correcciones SQL y documentación

Pipeline SDD ejecutado:
- explore:
- propose:
- spec:
- design:
- tasks:
- apply:
- verify:
- archive:

Archivos leídos:
-

Archivos modificados:
-

Archivos creados:
-

Cambios en schema.sql:
-

Cambios en seed.sql:
-

Cambios en documentación:
-

Cambios en OpenSpec:
-

Cambios en script de auditoría:
-

Verificaciones ejecutadas:
-

Resultado:
-

Pendientes:
-

Testing manual requerido:
si/no

Pasos de testing manual:
1.
2.
3.

Auditoría con ChatGPT recomendada:
si/no

Bloquea avance a Etapa 3:
si/no

Veredicto del agente:
-
```

No avances a Productos API hasta que Marcos apruebe esta etapa.
```

---

# Testing manual requerido después de esta etapa

Después de que OpenCode ejecute la etapa, Marcos debe probar:

## 1. Backend health

```bash
cd /home/marcos/Escritorio/Kermingo/kermingo_menu/backend
npm run dev
curl http://localhost:3001/api/health
```

## 2. Base de datos

Si se recrea base local:

```sql
DROP DATABASE IF EXISTS kermingo;
CREATE DATABASE kermingo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE kermingo;
SOURCE backend/src/api/database/schema.sql;
SOURCE backend/src/api/database/seed.sql;
```

## 3. Verificaciones SQL sugeridas

```sql
SELECT COUNT(*) AS productos FROM producto;

SELECT nombre, tipo, stock_limitado, stock_actual
FROM producto
WHERE tipo = 'promo';

SELECT nombre, stock_actual
FROM producto
WHERE nombre IN ('Pizza sin TACC', 'Helados palito');

SELECT *
FROM combo_producto;

SHOW INDEX FROM producto;
SHOW INDEX FROM pedido;
SHOW INDEX FROM producto_categoria;
SHOW INDEX FROM pedido_detalle;
```

## 4. Verificar que no se tocó frontend

```bash
git diff -- frontend
git diff -- diseno-de-landing-kermingo
```

La segunda carpeta no debe tener cambios.

## 5. Crear ZIP de auditoría

```bash
bash scripts/crear_zip_auditoria.sh
```

Verificar que el ZIP no tenga `.env`.

---

# Auditoría con ChatGPT después de esta etapa

Después de aplicar esta etapa, conviene volver a auditar solamente:

- `schema.sql`
- `seed.sql`
- script de auditoría
- documentación actualizada
- OpenSpec de corrección

Prompt sugerido:

```txt
Sos arquitecto de software senior y QA técnico. Te paso el ZIP actualizado de Kermingo después de la Etapa 2.1. Auditá específicamente si quedaron corregidos: idempotencia de índices, pedido.numero nullable, tipo promo, promos sin stock propio, productos agotados en seed, modo demo sin pedidos reales, script de auditoría sin .env y documentación alineada. Decime si ya puedo avanzar a Etapa 3 — Productos API.
```

---

# Veredicto esperado si todo se corrige

Si OpenCode aplica bien esta etapa, se debería poder avanzar a:

```txt
Etapa 3 — Productos API
```

Incluyendo:

- endpoints públicos de productos
- endpoints admin de productos
- filtros por categoría/tipo
- stock visible
- productos agotados
- promos con disponibilidad calculada por componentes, si se implementa en esa etapa o se deja preparado para pedidos
