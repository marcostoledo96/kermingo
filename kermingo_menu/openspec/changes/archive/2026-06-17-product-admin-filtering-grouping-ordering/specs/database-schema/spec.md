# Delta for database-schema

## MODIFIED Requirements

### Requirement: Schema must include 8 indexes on the `pedido` and `producto` tables

The system MUST create 8 indexes to support common query patterns, including stable product ordering.
(Previously: Schema required 7 indexes and did not index product order.)

#### Scenario: Indexes exist after execution
- GIVEN `schema.sql` is executed
- WHEN querying `SHOW INDEX` for relevant tables
- THEN `idx_producto_activo` on `producto(activo)` MUST exist
- AND `idx_producto_orden` on `producto(orden)` MUST exist
- AND all existing `pedido` indexes MUST remain present

#### Scenario: Index idempotency
- GIVEN the schema has already been applied
- WHEN `schema.sql` is re-run
- THEN index creation MUST not raise duplicate errors

### Requirement: Status and type fields must use ENUM constraints

The system MUST use MySQL `ENUM` for constrained status and type columns. `configuracion_tienda.categoria_default` MUST be `ENUM('merienda','cena') NOT NULL DEFAULT 'merienda'`.
(Previously: `categoria_default` did not exist.)

#### Scenario: Enumerated columns are constrained
- GIVEN the schema defines the relevant tables
- THEN existing ENUM columns MUST remain constrained
- AND `configuracion_tienda.categoria_default` MUST only allow `merienda` or `cena`

## ADDED Requirements

### Requirement: Product schema must support ordering and availability

The system MUST store `producto.orden INT NOT NULL DEFAULT 0` and `producto.disponible TINYINT(1) NOT NULL DEFAULT 1`.

#### Scenario: Product ordering fields exist
- GIVEN the schema defines `producto`
- WHEN a product row is inserted without explicit ordering fields
- THEN `orden` defaults to `0`
- AND `disponible` defaults to `1`

### Requirement: Migration scripts must preserve existing data safely

Manual migration SQL MUST assign deterministic `orden` values to existing products, default existing products to `disponible=1`, and default existing configuration rows to `categoria_default='merienda'`.

#### Scenario: Existing rows after migration
- GIVEN existing products and a configuration row
- WHEN the migration is applied
- THEN every product has non-null `orden` and `disponible=1`
- AND config `categoria_default` is `merienda` unless explicitly changed later
