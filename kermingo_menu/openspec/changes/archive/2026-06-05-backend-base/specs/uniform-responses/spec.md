# Uniform Responses Specification

## Purpose

Ensure every API response follows a single JSON envelope so clients can parse outputs predictably, regardless of endpoint or success/failure.

## Requirements

### Requirement: Success responses must use a uniform envelope

The system MUST return success responses as a JSON object with shape `{ ok: true, data: ..., message: ... }`.

#### Scenario: Successful operation returns envelope

- GIVEN an API endpoint completes successfully
- WHEN the response is sent
- THEN the response body MUST contain `ok: true`
- AND the response body MUST contain a `data` field (object, array, or null)
- AND the response body MUST contain a `message` field (string, may be empty)

#### Scenario: Endpoint with no payload still returns envelope

- GIVEN an endpoint has no data to return (e.g. a simple confirmation)
- WHEN the response is sent
- THEN `data` MUST be `null` or `{}`
- AND `message` MUST describe the result

### Requirement: Error responses must use a uniform envelope

The system MUST return error responses as a JSON object with shape `{ ok: false, error: "..." }`.

#### Scenario: Error returns envelope

- GIVEN an error occurs during request processing
- WHEN the error response is sent
- THEN the response body MUST contain `ok: false`
- AND the response body MUST contain an `error` field with a clear human-readable message string

### Requirement: Response helper functions must be used

The system MUST provide and use helper functions for constructing responses; route handlers MUST NOT call `res.json()` with raw objects.

#### Scenario: Success via helper

- GIVEN a route handler needs to send a success response
- WHEN it calls the success helper (e.g. `respuestaExitosa(res, data, message)`)
- THEN the response MUST match the success envelope shape
- AND the HTTP status MUST default to `200`

#### Scenario: Error via helper

- GIVEN a route handler needs to send an error response
- WHEN it calls the error helper (e.g. `respuestaError(res, error, statusCode)`)
- THEN the response MUST match the error envelope shape
- AND the HTTP status MUST be the provided `statusCode`

### Requirement: No raw res.json() in route handlers

The system MUST NOT permit direct `res.json({ ... })` calls inside route handler functions; all JSON responses MUST go through the helper functions.

#### Scenario: Raw response is avoided

- GIVEN a code review or lint check
- WHEN route files are inspected
- THEN no occurrence of `res.json(` MUST exist outside of helper definitions

## Testability

- Automated tests can intercept `res` and verify helper outputs produce the correct envelope.
- Static analysis (grep) can verify no `res.json` in `routes/` or `controllers/`.
