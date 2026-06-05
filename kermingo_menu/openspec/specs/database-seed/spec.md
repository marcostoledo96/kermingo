# Database Seed Specification

## Purpose

Populate the Kermingo database with initial data for categories, products, combos, store configuration, and a temporary admin user so the system is usable immediately after schema creation.

## Requirements

### Requirement: Seed must populate categories

The system MUST insert the two primary menu categories using idempotent statements.

#### Scenario: Categories exist after seeding

- GIVEN an empty `categoria` table
- WHEN `seed.sql` is executed
- THEN `Merienda` and `Cena` MUST be present

#### Scenario: Re-running category seed

- GIVEN `seed.sql` has already been executed
- WHEN it is run a second time
- THEN it MUST NOT create duplicate rows

### Requirement: Seed must populate 22 products

The system MUST insert 22 products covering food items, drinks, and combos from the Kermingo menu reference list.

#### Scenario: Products exist after seeding

- GIVEN an empty `producto` table
- WHEN `seed.sql` is executed
- THEN 22 rows MUST be present
- AND each row MUST have `nombre`, `precio`, `tipo`, `activo`, and `stock_limitado` values

#### Scenario: Re-running product seed

- GIVEN `seed.sql` has already been executed
- WHEN it is run a second time
- THEN it MUST NOT create duplicate rows

### Requirement: Seed must map products to categories

The system MUST link each product to its appropriate category via the `producto_categoria` join table.

#### Scenario: Product-category mappings exist

- GIVEN products and categories have been seeded
- WHEN querying `producto_categoria`
- THEN each product MUST be associated with at least one category
- AND combo products MAY appear in both categories

#### Scenario: Re-running mapping seed

- GIVEN mappings already exist
- WHEN `seed.sql` is re-run
- THEN no duplicate mappings MUST be created

### Requirement: Seed must define combo components

The system MUST insert the internal product relationships for any combo/promotion items into `combo_producto`.

#### Scenario: Combo components exist

- GIVEN a combo product exists in `producto`
- WHEN `seed.sql` is executed
- THEN `combo_producto` MUST contain rows linking the combo to its component products
- AND `cantidad` MUST reflect how many of each component are included per combo

#### Scenario: Re-running combo seed

- GIVEN combo mappings already exist
- WHEN `seed.sql` is re-run
- THEN no duplicate rows MUST be created

### Requirement: Seed must initialize store configuration

The system MUST create a single row in `configuracion_tienda` with a safe default state.

#### Scenario: Store starts closed

- GIVEN an empty `configuracion_tienda` table
- WHEN `seed.sql` is executed
- THEN exactly one row MUST exist
- AND `estado` MUST be `'cerrada'`
- AND `id` MUST be `1`

### Requirement: Seed must create a temporary admin user

The system MUST insert one admin user with a pre-computed bcrypt hash so authentication can be tested immediately.

#### Scenario: Admin user exists

- GIVEN an empty `usuario` table
- WHEN `seed.sql` is executed
- THEN exactly one admin user MUST exist
- AND `contrasenia_hash` MUST contain a bcrypt hash, not plain text
- AND the row MUST be clearly commented as TEMPORAL pending the B4 auth stage

#### Scenario: Re-running admin seed

- GIVEN the admin user already exists
- WHEN `seed.sql` is re-run
- THEN no duplicate admin user MUST be created