# Delta for Caja Test Hygiene

## ADDED Requirements

### Requirement: Unique Run Prefix Per Test Execution

The test suite **MUST** generate a unique prefix per test run to prevent cross-run data collisions.

#### Scenario: Each test run uses unique RUN_ID

- WHEN the test suite starts
- THEN a `RUN_ID` is generated in format `TEST-B6-2-{timestamp}-{random}`
- AND all test pedidos use this prefix in `nombre_cliente`

#### Scenario: Cleanup targets only current run's data

- WHEN cleanup runs after tests
- THEN only pedidos matching the current `RUN_ID` prefix are cleaned up
- AND no data from other runs or manual entries is affected

### Requirement: Cleanup Must Not Over-Restore Stock of Cancelled Pedidos

The cleanup function **MUST** read `estado_pedido` for each test pedido and skip stock restoration for cancelled pedidos.

#### Scenario: Cancelled pedido is skipped during cleanup

- GIVEN a test pedido that was cancelled during test execution
- WHEN cleanup runs
- THEN the pedido is identified as `estado_pedido = cancelado`
- AND stock restoration is skipped for this pedido

#### Scenario: Non-cancelled pedido gets stock restored

- GIVEN a test pedido with `estado_pedido != cancelado`
- WHEN cleanup runs
- THEN stock is restored for its items as before

### Requirement: MySQL Pool Must Close After Tests

The test suite **MUST** close the MySQL connection pool after all tests complete to prevent open handles.

#### Scenario: Pool closes after all tests

- WHEN all tests in `caja.test.js` complete
- THEN `afterAll` calls `pool.end()`
- AND Jest exits without open handle warnings

### Requirement: Payment Transition Tests by Method

The test suite **MUST** include tests validating payment transitions per `metodo_pago`.

#### Scenario: Test efectivo blocks comprobante_subido

- WHEN test sends `PATCH /api/admin/pedidos/:id/pago` with `{ estado_pago: "comprobante_subido" }` on an efectivo pedido
- THEN response is 400

#### Scenario: Test transferencia allows rechazado → comprobante_subido

- WHEN test sends `PATCH` on a transferencia pedido with `estado_pago = rechazado` to `comprobante_subido`
- THEN response is 200

#### Scenario: Test pagado is terminal

- WHEN test sends any transition away from `pagado`
- THEN response is 400

### Requirement: Partial Edit Tests

The test suite **MUST** include tests for metadata-only edits without `items`.

#### Scenario: Test edit only nombre_cliente

- WHEN test sends `PUT /api/admin/pedidos/:id` with `{ nombre_cliente: "Test Name" }`
- THEN response is 200, name is updated, items unchanged

#### Scenario: Test edit only metodo_pago

- WHEN test sends `PUT /api/admin/pedidos/:id` with `{ metodo_pago: "transferencia" }`
- THEN response is 200, method is updated, estado_pago is coherent

#### Scenario: Test empty body rejected

- WHEN test sends `PUT /api/admin/pedidos/:id` with `{}`
- THEN response is 400
