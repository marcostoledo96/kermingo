# 16 — Testing

## Backend

Stack:

```txt
Jest
Supertest
```

Tests prioritarios:

1. health
2. productos públicos
3. login
4. auth me
5. crear pedido efectivo
6. crear pedido transferencia sin comprobante debe fallar
7. crear pedido transferencia con comprobante
8. stock insuficiente
9. cancelar pedido repone stock
10. caja rápida efectivo pagado
11. cambiar estado cocina
12. comprobar formato uniforme de respuesta

## Frontend

Stack:

```txt
Vitest
React Testing Library
```

Tests prioritarios:

1. landing renderiza CTA Ver menú
2. menú muestra productos mock
3. carrito agrega/quita productos
4. carrito persiste localStorage
5. checkout oculta comprobante en efectivo
6. checkout muestra comprobante en transferencia
7. login muestra error
8. pantalla seguimiento muestra estado

## E2E

Stack recomendado:

```txt
Playwright
```

Flujo mínimo:

1. entrar a landing
2. ir a menú
3. agregar producto
4. ir carrito
5. checkout efectivo
6. confirmar
7. ver ticket

## Criterio

No hace falta cobertura perfecta. Priorizar flujos críticos del evento.
