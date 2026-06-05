# Delta for Centralized Config

## ADDED Requirements

### Requirement: Database port must be configurable via environment variable

The centralized config module MUST expose `db.port` so the pool module can connect to non-standard MySQL ports.

#### Scenario: Custom DB port

- GIVEN `DB_PORT` is set to `3307`
- WHEN the config module is loaded
- THEN `config.db.port` MUST equal `3307`

#### Scenario: Default DB port

- GIVEN `.env` does not define `DB_PORT`
- WHEN the config module is loaded
- THEN `config.db.port` MUST default to `3306`

## MODIFIED Requirements

### Requirement: Missing required variables must fail fast on startup

The centralized config module MUST validate that all required variables are present and throw an error during module initialization if any are missing.
(Previously: required vars list did not include `DB_PORT`)

#### Scenario: Required variable missing

- GIVEN a required environment variable is absent
- WHEN the config module is imported in production
- THEN it MUST throw a clear error describing which variable is missing
- AND the server MUST NOT start

#### Scenario: Production validation includes DB_PORT

- GIVEN `NODE_ENV` is `production`
- WHEN the config module validates required variables
- THEN `DB_PORT` MUST be included in the required list alongside `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and `JWT_SECRET`
- AND a missing `DB_PORT` MUST cause the module to throw

#### Scenario: All required variables present

- GIVEN all required environment variables are defined, including `DB_PORT`
- WHEN the config module is imported
- THEN it MUST export a frozen/readable configuration object without throwing

#### Scenario: Backward compatibility in development

- GIVEN `NODE_ENV` is `development` and `DB_PORT` is missing
- WHEN the config module is imported
- THEN it MUST NOT throw
- AND `config.db.port` MUST default to `3306`

## REMOVED Requirements

(No requirements are removed in this change.)
