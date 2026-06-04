---
name: kermingo-backend-api
description: Usar cuando se trabaje en backend Express/MySQL de Kermingo: API REST, MVC, stock, pedidos, auth, Drive, Excel o tests backend.
---

# Kermingo Backend API Skill

## Cuándo usar

Usar antes de modificar archivos dentro de `backend/`.

## Contexto obligatorio

- Backend Express API REST, sin EJS.
- MySQL con tablas en español singular.
- Arquitectura MVC.
- ESM.
- `mysql2/promise` y placeholders `?`.
- Auth admin con JWT en cookie httpOnly 24h.
- Zod para validar requests.
- Multer memoryStorage + Google Drive API.
- Stock se descuenta en transacción al crear pedido.
- Cancelar pedido repone stock.
- Combos reales descuentan componentes.

## Leer antes

```txt
AGENTS.md
docs/04-BACKEND_API_EXPRESS_MYSQL.md
docs/05-BASE_DE_DATOS_MYSQL.md
docs/06-ENDPOINTS_API.md
docs/17-TAREAS_BACKEND_DETALLADAS.md
```

## Reglas

- No poner SQL en routes.
- No poner lógica de negocio pesada en controllers.
- No confiar en precios del frontend.
- No guardar contraseñas sin hash.
- No usar `origin: '*'` con cookies.
- No decir que una tarea está lista sin ejecutar una verificación.
