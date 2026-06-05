# Centralized Config Specification

## Purpose

Prevent `process.env` from being scattered across the codebase by funneling all environment access through a single module. This makes the app easier to configure, test, and validate at startup.

## Requirements

### Requirement: All environment variables must be accessed through a single config module

The system MUST read every environment variable exclusively via `backend/src/api/config/environments.js`. No other file in the backend MAY call `process.env` directly.

#### Scenario: Server startup uses config module

- GIVEN the backend is starting
- WHEN the server reads the listening port
- THEN it MUST obtain the port from the centralized config module
- AND it MUST NOT read `process.env.PORT` directly in `server.js` or `app.js`

#### Scenario: Middleware uses config module

- GIVEN `cors` or `cookie-parser` middleware needs configuration values
- WHEN the app is initialized
- THEN those values MUST come from the centralized config module
- AND no middleware file MAY access `process.env` directly

### Requirement: Default values must be provided for optional variables

The centralized config module MUST supply sensible defaults so the app can run in development without a fully populated `.env` file.

#### Scenario: Port defaults to 3001

- GIVEN `.env` does not define `PORT`
- WHEN the config module is loaded
- THEN `config.port` MUST default to `3001`

#### Scenario: NODE_ENV defaults to development

- GIVEN `.env` does not define `NODE_ENV`
- WHEN the config module is loaded
- THEN `config.nodeEnv` MUST default to `"development"`

### Requirement: Missing required variables must fail fast on startup

The centralized config module MUST validate that all required variables are present and throw an error during module initialization if any are missing.

#### Scenario: Required variable missing

- GIVEN a required environment variable (e.g. `JWT_SECRET` in later stages) is absent
- WHEN the config module is imported
- THEN it MUST throw a clear error describing which variable is missing
- AND the server MUST NOT start

#### Scenario: All required variables present

- GIVEN all required environment variables are defined
- WHEN the config module is imported
- THEN it MUST export a frozen/readable configuration object without throwing

## Testability

- Unit tests can mock `process.env`, import the config module, and assert the exported object values.
- A missing required variable test can verify the module throws on import.
- Static analysis (grep) can verify no `process.env` outside `config/environments.js`.
