# API Health Specification

## Purpose

Provide a liveness probe endpoint so deployers, load balancers, and monitoring can verify that the Kermingo backend HTTP layer is reachable and responsive.

## Requirements

### Requirement: Health endpoint must be reachable

The system MUST expose a `GET /api/health` endpoint that returns a JSON payload confirming the API is alive.

#### Scenario: Happy path — API is alive

- GIVEN the backend server is running
- WHEN a client sends `GET /api/health`
- THEN the response status MUST be `200`
- AND the response body MUST be a JSON object containing `ok: true`
- AND the response body MUST include `data.status` equal to `"ok"`
- AND the response body MUST include `data.timestamp` with the current ISO 8601 timestamp

#### Scenario: No database dependency

- GIVEN the backend is running without any MySQL connection configured
- WHEN a client sends `GET /api/health`
- THEN the endpoint MUST still return `200`
- AND the response MUST NOT attempt to query a database or fail due to missing database credentials

### Requirement: Unsupported HTTP methods must be rejected

The system MUST NOT allow `POST`, `PUT`, `DELETE`, or `PATCH` on `/api/health`.

#### Scenario: Method restriction

- GIVEN the backend server is running
- WHEN a client sends `POST /api/health`
- THEN the response status MUST be `404`
- AND the response MUST be a valid JSON error envelope

## Testability

- Automated tests can verify `GET /api/health` returns `200` and correct shape.
- Automated tests can verify `POST /api/health` returns `404`.
- No external services (database, auth, Drive) are required for these tests.
