# Delta for Admin Config Security

## ADDED Requirements

### Requirement: requireTrustedOrigin on Admin Config PUT

The system **MUST** apply the `requireTrustedOrigin` middleware to `PUT /api/admin/configuracion-tienda` to prevent CSRF attacks on store configuration changes.

#### Scenario: PUT configuracion-tienda requires trusted origin

- GIVEN an admin user with valid cookie
- WHEN `PUT /api/admin/configuracion-tienda` is called from an untrusted origin (missing Referer/Origin header or mismatched host)
- THEN the request is rejected with 403

#### Scenario: PUT configuracion-tienda succeeds from trusted origin

- GIVEN an admin user with valid cookie
- WHEN `PUT /api/admin/configuracion-tienda` is called from the same origin
- THEN the request passes the origin check and proceeds to validation and update

(Previously: `PUT /api/admin/configuracion-tienda` had `requireAdmin` but no `requireTrustedOrigin`, unlike other admin mutation routes.)
