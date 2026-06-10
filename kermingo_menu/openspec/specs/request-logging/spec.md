# Request Logging Specification

## Purpose

Control request logging behavior by environment to prevent sensitive data (tokens, query strings) from appearing in production logs while maintaining debug visibility in development.

## Requirements

### Requirement: Production must not log full request URLs

The system MUST NOT log full request URLs (including query strings) when `NODE_ENV=production`. In production, only the HTTP method and request path (without query parameters) SHOULD be logged, or logging SHOULD be disabled entirely. In non-production environments, full URL logging MAY continue for debugging.

#### Scenario: Production redacts query strings

- GIVEN `NODE_ENV=production`
- AND a request arrives with URL `/api/pedidos?token=secret123&ref=abc`
- WHEN the request is logged
- THEN the log entry contains only `GET /api/pedidos` (path, no query string)
- AND no tokens or sensitive query parameters appear in stdout

#### Scenario: Development logs full URL

- GIVEN `NODE_ENV=development`
- AND a request arrives with URL `/api/pedidos?token=abc`
- WHEN the request is logged
- THEN the log entry contains the full URL including query string

#### Scenario: Authorization headers are never logged

- GIVEN any environment
- AND a request with `Authorization: Bearer <token>` or cookie containing JWT
- WHEN the request is processed
- THEN the log entry MUST NOT contain the token value
- AND the log entry MUST NOT contain the full cookie header

#### Scenario: Request logging can be fully disabled

- GIVEN `DISABLE_REQUEST_LOG=true` is set
- WHEN any request arrives
- THEN no request log line is written to stdout

**Traceability**: `backend/src/app.js`, `DOCUMENTACION/IA/GOTCHAS.md` (log redaction note)
