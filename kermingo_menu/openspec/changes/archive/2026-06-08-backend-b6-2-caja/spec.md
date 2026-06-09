# Spec: backend-b6-2-caja

## Scope

- Covers only B6.2 cashier/payment-admin behavior for caja.
- Keeps `comprobante_subido` compatible for B6.3 without pulling upload or Drive behavior into this slice.
- Makes stock and pago invariants explicit for edit, cancel, and manual mark-paid flows.

## ADDED Requirements

### Requirement: Admin payment-state machine for caja follow-up

The system MUST restrict admin payment changes to forward-safe transitions: `pendiente -> pagado`, `pendiente -> comprobante_subido`, `comprobante_subido -> pagado`, `comprobante_subido -> rechazado`, and `rechazado -> pendiente`. `pagado` SHALL be terminal, and payment changes MUST NOT alter stock.

#### Scenario: Valid admin payment progression

- GIVEN an authenticated admin and a pedido with `estado_pago = comprobante_subido`
- WHEN the admin changes payment to `pagado`
- THEN the system MUST persist the new payment state
- AND it MUST keep stock and `estado_pedido` unchanged

#### Scenario: Invalid backward payment transition

- GIVEN an authenticated admin and a pedido with `estado_pago = pagado`
- WHEN the admin requests `estado_pago = pendiente`
- THEN the system MUST reject the request with 400

### Requirement: Caja manual mark-paid behavior

The system MUST allow caja to mark `pendiente -> pagado` manually for `efectivo` pedidos and for `transferencia` pedidos already verified by the seller, even when no comprobante file exists. This slice MUST NOT require upload, Drive, or approval APIs.

#### Scenario: Caja cash sale marked paid

- GIVEN an authenticated admin and a caja pedido with `metodo_pago = efectivo` and `estado_pago = pendiente`
- WHEN caja marks it as `pagado`
- THEN the system MUST accept the transition and return the updated pedido

#### Scenario: Caja verified transfer marked paid without comprobante

- GIVEN an authenticated admin and a caja pedido with `metodo_pago = transferencia` and `estado_pago = pendiente`
- WHEN caja marks it as `pagado`
- THEN the system MUST accept the transition without requiring `comprobante_subido`

### Requirement: Pending-payment visibility for caja

The system MUST provide an authenticated admin listing/filter path that isolates pedidos needing payment follow-up, including unpaid transfer and cash pedidos. The filter MUST exclude `pagado` pedidos and MAY reuse the existing admin pedido listing surface.

#### Scenario: Filter unpaid pedidos for caja

- GIVEN authenticated admin requests pedidos with the caja unpaid filter
- WHEN pedidos exist in `pendiente` or `rechazado`
- THEN the response MUST include only pedidos still needing payment follow-up

### Requirement: Caja pedido correction with stock reconciliation

The system SHOULD allow authenticated admins to edit eligible caja pedidos through `PUT /api/admin/pedidos/:id` only for sale correction. The edit flow MUST run atomically: restore prior stock reservations, validate the new item set, apply new deductions, rewrite detalle lines, and recalculate total. It MUST reject edits for cancelled pedidos, and a failed edit MUST leave pedido, total, and stock unchanged.

#### Scenario: Edit caja pedido successfully

- GIVEN an authenticated admin and an eligible non-cancelled pedido
- WHEN the admin replaces items with a valid in-stock set
- THEN the system MUST persist the new detalle and recalculated total
- AND it MUST reconcile stock in the same transaction

#### Scenario: Edit fails for insufficient stock

- GIVEN an authenticated admin editing an eligible pedido
- WHEN the new item set exceeds current available stock
- THEN the system MUST reject the edit with 409
- AND it MUST preserve the original detalle, total, and stock

## Manual Test Scenarios (local DB + curl)

1. Seed local DB with one caja pedido `efectivo` pending, one caja pedido `transferencia` pending, one pedido `comprobante_subido`, and one pedido already `pagado`; login admin and save `cookie.txt`.
2. `curl -b cookie.txt -X PATCH /api/admin/pedidos/:id/pago -H 'Content-Type: application/json' -d '{"estado_pago":"pagado"}'` on the cash pending pedido → 200, payment updates, stock unchanged.
3. Same PATCH on the transfer pending pedido without comprobante → 200 for caja-verified manual payment.
4. Same PATCH on the already paid pedido with `{"estado_pago":"pendiente"}` → 400.
5. `curl -b cookie.txt GET /api/admin/pedidos?...` using the unpaid/caja filter → only `pendiente` and `rechazado` pedidos are returned.
6. `curl -b cookie.txt -X PUT /api/admin/pedidos/:id ...` with a valid replacement item set → total and detalle update; stock reflects the delta.
7. Repeat the PUT with insufficient stock → 409; re-read pedido and stock to confirm no mutation.

## Checkpoint Notes

- Checkpoint automatico: pendiente
- Checkpoint manual requerido: si
- Auditoria con ChatGPT recomendada: si (mandatory por pagos/stock)
- Bloquea avance a siguiente etapa: si
