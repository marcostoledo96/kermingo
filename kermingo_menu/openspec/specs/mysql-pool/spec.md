# MySQL Pool Specification

## Purpose

Provide a centralized, resilient `mysql2/promise` connection pool that any backend module can import without causing startup failures when MySQL is unavailable.

## Requirements

### Requirement: Pool must be created from centralized config

The system MUST create a `mysql2/promise` connection pool using ONLY the `db` configuration block exported by `backend/src/api/config/environments.js`.

#### Scenario: Pool uses config values

- GIVEN the centralized config module exposes `db.host`, `db.port`, `db.user`, `db.password`, `db.database`
- WHEN the pool module is imported
- THEN it MUST pass those values to `createPool()`
- AND it MUST NOT contain any hardcoded credentials

#### Scenario: Pool options are set for Express workloads

- GIVEN the pool is being configured
- WHEN `createPool()` is called
- THEN it MUST set `waitForConnections: true`
- AND it MUST set `connectionLimit` to a sensible value (e.g. `10`)
- AND it MUST set `queueLimit` to `0` (unlimited queue)

### Requirement: Import must never crash when MySQL is unavailable

The pool module MUST be importable without throwing, even when the database server is down or credentials are empty.

#### Scenario: MySQL server offline

- GIVEN the MySQL server is not running
- WHEN any file imports the pool module
- THEN the import MUST succeed
- AND the pool MUST defer actual connection attempts until the first query

#### Scenario: Empty config in development

- GIVEN `DB_HOST` is empty and `NODE_ENV` is `development`
- WHEN the pool module is imported
- THEN it MUST NOT throw an error
- AND it MAY log a warning about missing configuration

### Requirement: Pool must be exported as a single default export

The system MUST export the pool instance as the module's default export so that consumers have a consistent import pattern.

#### Scenario: Consumer imports pool

- GIVEN a controller or service needs to query the database
- WHEN it imports the pool module
- THEN it MUST receive a single object via default import
- AND that object MUST expose `.execute()` and `.query()` from `mysql2/promise`

### Requirement: Health endpoint must remain independent

The existing `GET /api/health` endpoint MUST continue to return `200` regardless of MySQL availability.

#### Scenario: Health without database

- GIVEN the backend is running without MySQL configured
- WHEN a client sends `GET /api/health`
- THEN the response MUST still be `200 ok`
- AND the response MUST NOT attempt to use the pool or fail because of it