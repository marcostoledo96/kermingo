# Database Schema Specification

## Purpose

Define the complete, idempotent DDL for all Kermingo tables, foreign keys, indexes, and constraints in a single SQL file.

## Requirements

### Requirement: Schema must define 9 tables with correct ordering

The system MUST provide a `schema.sql` file that creates all 9 Kermingo tables in an order that respects foreign key dependencies.

#### Scenario: All tables exist after execution

- GIVEN an empty MySQL database
- WHEN `schema.sql` is executed
- THEN the following tables MUST exist: `usuario`, `archivo_drive`, `categoria`, `producto`, `producto_categoria`, `combo_producto`, `pedido`, `pedido_detalle`, `configuracion_tienda`

#### Scenario: Foreign key order is respected

- GIVEN `schema.sql` is executed
- WHEN tables with foreign keys are created
- THEN referenced tables (`archivo_drive`, `categoria`) MUST appear before referencing tables (`producto`, `pedido`, `combo_producto`)
- AND `producto` MUST appear before `combo_producto` and `producto_categoria`
- AND `pedido` MUST appear before `pedido_detalle`

### Requirement: All CREATE TABLE statements must be idempotent

The system MUST use `IF NOT EXISTS` on every `CREATE TABLE` so the file can be re-run safely.

#### Scenario: Re-running schema

- GIVEN the schema has already been applied
- WHEN `schema.sql` is executed a second time
- THEN it MUST complete without errors
- AND it MUST NOT drop or alter existing tables

### Requirement: Schema must include 7 indexes on the `pedido` and `producto` tables

The system MUST create 7 indexes to support common query patterns.

#### Scenario: Indexes exist after execution

- GIVEN `schema.sql` is executed
- WHEN querying `SHOW INDEX` for relevant tables
- THEN the following indexes MUST exist:
  - `idx_producto_activo` on `producto(activo)`
  - `idx_pedido_numero` on `pedido(numero)`
  - `idx_pedido_token` on `pedido(token_seguimiento)`
  - `idx_pedido_estado_pedido` on `pedido(estado_pedido)`
  - `idx_pedido_estado_pago` on `pedido(estado_pago)`
  - `idx_pedido_metodo_pago` on `pedido(metodo_pago)`
  - `idx_pedido_created_at` on `pedido(created_at)`

#### Scenario: Index idempotency

- GIVEN the schema has already been applied
- WHEN `schema.sql` is re-run
- THEN index creation MUST not raise duplicate errors

### Requirement: Naming conventions must be followed

The system MUST use Spanish singular names without tildes and without the letter `ñ` for all tables, columns, and constraints.

#### Scenario: Table and column names are valid

- GIVEN the schema is reviewed
- THEN no table or column name MAY contain `ñ` or tildes (e.g. `contrasenia_hash`, not `contraseña_hash`)
- AND all table names MUST be singular (e.g. `pedido`, not `pedidos`)

### Requirement: Phone fields must be VARCHAR

The system MUST store phone numbers as `VARCHAR`, not as numeric types.

#### Scenario: Phone columns are text

- GIVEN the schema defines `pedido`
- THEN `telefono_cliente` MUST be `VARCHAR(40)`
- AND `telefono_whatsapp` MUST be `VARCHAR(30)`

### Requirement: Stock fields must allow null when stock is unlimited

The system MUST allow `producto.stock_actual` to be `NULL` when the product does not track stock.

#### Scenario: Unlimited stock product

- GIVEN a product has `stock_limitado = 0`
- THEN `stock_actual` MAY be `NULL`
- AND `stock_minimo_alerta` MUST still have a default value

### Requirement: Status and type fields must use ENUM constraints

The system MUST use MySQL `ENUM` for constrained status and type columns.

#### Scenario: Enumerated columns are constrained

- GIVEN the schema defines the relevant tables
- THEN `producto.tipo` MUST be `ENUM('comida','bebida','combo')`
- AND `pedido.metodo_pago` MUST be `ENUM('transferencia','efectivo')`
- AND `pedido.estado_pago` MUST be `ENUM('pendiente','comprobante_subido','pagado','rechazado')`
- AND `pedido.estado_pedido` MUST be `ENUM('recibido','en_preparacion','listo','entregado','cancelado')`
- AND `configuracion_tienda.estado` MUST be `ENUM('abierta','cerrada','demo')`
- AND `archivo_drive.tipo` MUST be `ENUM('producto_imagen','comprobante')`

### Requirement: Timestamps must be set automatically

The system MUST define `created_at` and `updated_at` columns with automatic defaults where applicable.

#### Scenario: Automatic timestamps

- GIVEN a row is inserted into `producto`, `pedido`, or `usuario`
- THEN `created_at` MUST default to `CURRENT_TIMESTAMP`
- AND `updated_at` MUST default to `CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`