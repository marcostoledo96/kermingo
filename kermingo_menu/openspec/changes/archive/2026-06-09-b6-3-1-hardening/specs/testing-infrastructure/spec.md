# Testing Infrastructure Specification

## Purpose

Ensure the backend test suite runs deterministically with `--runInBand`, isolates external services (Google Drive) behind opt-in flags, and provides clear separation between unit and integration tests.

## Requirements

### Requirement: npm test must run with --runInBand

The system MUST run Jest with `--runInBand` flag in the `npm test` script to prevent concurrent MySQL pool interference. The `package.json` MUST provide separate scripts: `test:unit` (no DB, fast) and `test:integration` (requires MySQL, `--runInBand`).

#### Scenario: npm test runs all suites sequentially

- GIVEN `cd backend && npm test` is executed
- WHEN Jest starts
- THEN it runs with `--runInBand` (no parallel workers)
- AND all 162+ tests pass with 0 failures
- AND no "Jest did not exit" warnings occur

#### Scenario: test:unit runs without database

- GIVEN `cd backend && npm run test:unit` is executed
- WHEN Jest starts
- THEN only unit tests run (files matching `*.unit.test.js`)
- AND no MySQL connection is attempted
- AND tests pass without a running MySQL server

#### Scenario: test:integration requires MySQL

- GIVEN `cd backend && npm run test:integration` is executed
- WHEN Jest starts
- THEN integration tests run with `--runInBand`
- AND tests require a running MySQL server with seed data
- AND if MySQL is unavailable, tests fail with a clear message

### Requirement: Drive tests must be opt-in via RUN_REAL_DRIVE_TESTS

The system MUST NOT contact Google Drive during tests unless `RUN_REAL_DRIVE_TESTS=true` is explicitly set. By default, all Drive-related tests MUST use mocks/stubs. The `DRIVE_CONFIGURED` check in test files MUST respect this flag.

#### Scenario: Default behavior skips real Drive

- GIVEN `RUN_REAL_DRIVE_TESTS` is not set (or `false`)
- WHEN Drive-related tests run
- THEN no real Google Drive API calls are made
- AND tests use mocked Drive service

#### Scenario: Opt-in enables real Drive

- GIVEN `RUN_REAL_DRIVE_TESTS=true` is set
- AND valid Drive credentials are configured
- WHEN Drive-related tests run
- THEN real Google Drive API calls are made
- AND tests verify end-to-end upload behavior

#### Scenario: Opt-in without credentials fails gracefully

- GIVEN `RUN_REAL_DRIVE_TESTS=true` is set
- AND `GOOGLE_DRIVE_CREDENTIALS_JSON` is not configured
- WHEN Drive-related tests run
- THEN tests are skipped with a clear warning about missing credentials

**Traceability**: `backend/package.json` (scripts), `backend/tests/comprobantes.test.js`, `backend/tests/comprobantes.drive-mock.test.js`, `backend/tests/comprobantes.unit.test.js`, `DOCUMENTACION/IA/TESTING.md`
