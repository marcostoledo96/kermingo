# Error Handling Specification

## Purpose

Provide a centralized, consistent mechanism for catching and formatting all unhandled errors so clients receive predictable JSON error envelopes and sensitive details are never leaked.

## Requirements

### Requirement: A global Express error middleware must catch all unhandled errors

The system MUST register a single error-handling middleware after all routes and other middleware so that any thrown or passed error is intercepted and formatted. `DriveUploadError` instances MUST be recognized by the middleware via `err.name === 'DriveUploadError'` and mapped to 503, replacing the previous string-based error matching approach.

(Previously: Controller used `err.message.includes('Failed to upload')` string matching to detect Drive errors)

#### Scenario: Known application error is caught

- GIVEN a route handler throws an `AppError` (or calls `next` with one)
- WHEN the request reaches the error middleware
- THEN the response status MUST equal the error's `statusCode`
- AND the response body MUST be a JSON error envelope with `ok: false`
- AND the `error` field MUST contain the `AppError` message

#### Scenario: DriveUploadError is caught and mapped to 503

- GIVEN a controller throws `DriveUploadError`
- WHEN the request reaches the error middleware
- THEN `err.name === 'DriveUploadError'` is detected
- AND the response status MUST be `503`
- AND the response body MUST be `{ ok: false, error: "Servicio de upload no disponible" }`

#### Scenario: Unknown error is caught

- GIVEN a route handler throws a generic `Error` or an unexpected exception
- WHEN the request reaches the error middleware
- THEN the response status MUST be `500`
- AND the response body MUST be a JSON error envelope with `ok: false`
- AND the `error` field MUST contain a generic message (e.g. `"Error interno del servidor"`)
- AND the raw error message MUST NOT be exposed to the client

### Requirement: Error middleware must be the last middleware registered

The system MUST register the error middleware after all routes, 404 handlers, and other middleware in `app.js`.

#### Scenario: Middleware order is correct

- GIVEN the Express app is initialized
- WHEN inspecting the middleware stack
- THEN the error middleware MUST appear after the router and 404 middleware

### Requirement: Custom error classes must exist

The system MUST provide at least the following minimal error classes extending a base `AppError`:
- `AppError` — base class with `message` and `statusCode`
- `ValidationError` — for request validation failures (`400`)
- `NotFoundError` — for missing resources (`404`)
- `AuthError` — for authentication/authorization failures (`401`/`403`)
- `DriveUploadError` — for Google Drive upload failures (`503`)

#### Scenario: ValidationError behavior

- GIVEN a validation failure occurs
- WHEN a `ValidationError` is thrown
- THEN the error middleware MUST respond with status `400`
- AND the response MUST include the validation message

#### Scenario: NotFoundError behavior

- GIVEN a resource does not exist
- WHEN a `NotFoundError` is thrown
- THEN the error middleware MUST respond with status `404`
- AND the response MUST include a clear not-found message

#### Scenario: AuthError behavior

- GIVEN an authentication or authorization failure occurs
- WHEN an `AuthError` is thrown
- THEN the error middleware MUST respond with status `401` or `403`
- AND the response MUST include an auth-related message

#### Scenario: DriveUploadError behavior

- GIVEN a Google Drive upload fails for any reason (network, credentials, quota, rate limit, timeout)
- WHEN a `DriveUploadError` is thrown
- THEN the error middleware MUST respond with status `503`
- AND the response MUST include `"Servicio de upload no disponible"`
- AND the client MUST NOT see internal Drive API error details

### Requirement: Stack traces must be hidden in production

The system MUST omit `stack` from the JSON error response when `NODE_ENV` is `"production"`.

#### Scenario: Production mode hides stack

- GIVEN `NODE_ENV` is set to `"production"`
- WHEN an error is handled by the middleware
- THEN the response body MUST NOT contain a `stack` field

#### Scenario: Development mode shows stack

- GIVEN `NODE_ENV` is set to `"development"`
- WHEN an error is handled by the middleware
- THEN the response body MAY include a `stack` field for debugging

## Testability

- Unit tests can instantiate each error class, pass it to the middleware, and assert status + envelope shape.
- Tests can set `NODE_ENV` to production and verify no `stack` in the response body.
- Tests can trigger a generic `throw new Error('secret')` and verify the client does not see "secret".
