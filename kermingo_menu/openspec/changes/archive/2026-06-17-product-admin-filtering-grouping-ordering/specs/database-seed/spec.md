# Delta for database-seed

## MODIFIED Requirements

### Requirement: Seed must populate 22 products

The system MUST insert 22 products covering food items, drinks, and combos from the Kermingo menu reference list. Each seeded product MUST include deterministic `orden` and default `disponible=1`.
(Previously: Seed required product basics but not order or availability.)

#### Scenario: Products exist after seeding
- GIVEN an empty `producto` table
- WHEN `seed.sql` is executed
- THEN 22 rows MUST be present
- AND each row MUST have `nombre`, `precio`, `tipo`, `activo`, `stock_limitado`, `orden`, and `disponible`

#### Scenario: Re-running product seed
- GIVEN `seed.sql` has already been executed
- WHEN it is run a second time
- THEN it MUST NOT create duplicate rows
- AND existing deterministic order MUST remain stable unless the admin later changes it

### Requirement: Seed must initialize store configuration

The system MUST create a single row in `configuracion_tienda` with safe defaults: `estado='cerrada'`, `id=1`, and `categoria_default='merienda'`.
(Previously: Config seed did not include default menu category.)

#### Scenario: Store starts closed with merienda tab
- GIVEN an empty `configuracion_tienda` table
- WHEN `seed.sql` is executed
- THEN exactly one row MUST exist
- AND `estado` MUST be `cerrada`
- AND `categoria_default` MUST be `merienda`
