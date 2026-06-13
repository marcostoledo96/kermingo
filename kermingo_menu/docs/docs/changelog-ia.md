# Changelog IA

## Fase B5.3 — Implementación de Subida y Procesamiento de Imágenes de Producto (2026-06-13)

### Cambios aplicados

- **Procesamiento de Imágenes (`image.service.js` y dependencias)**:
  - Instalado `sharp` para redimensionar (máx 900x900px, adaptativo), rotar (según orientación EXIF) y convertir automáticamente a WebP con calidad 75.
- **Google Drive (`drive.service.js` y `errors.js`)**:
  - Actualizado `uploadFile` para soportar la carpeta dedicada de productos (`GOOGLE_DRIVE_PRODUCTOS_FOLDER_ID`) o raíz del Drive.
  - Implementado `downloadFile` para recuperar el stream de lectura de archivos, lanzando la nueva excepción `DriveReadError` (HTTP 503) ante fallos.
- **Middlewares de Validación (`upload.middleware.js`)**:
  - Configurado `uploadProductoImagen` usando Multer (memoryStorage, límite 5MB, JPG/PNG/WEBP).
  - Creado `assertProductImageMagicBytes` para la validación rigurosa de tipo real de archivo usando bytes mágicos (magic bytes).
- **Modelos de Base de Datos (`archivo.model.js` y `producto.model.js`)**:
  - Implementado `findProductImageByProductId` para resolver el archivo de imagen de un producto.
  - Actualizado `SQL_BASE_PUBLIC` y `SQL_BASE_ADMIN` en `producto.model.js` con un `LEFT JOIN` a `archivo_drive` para exponer la URL pública dinámica del stream de imagen (`/api/productos/:id/imagen?v={id}`).
  - Agregadas las operaciones `findByIdAdmin` y `updateImagenArchivoId`.
- **Controladores y Rutas (`producto.controller.js` y `producto.routes.js`)**:
  - Implementado `obtenerImagen` que transmite la imagen como stream proxy de Drive con cabeceras de caché agresivas (`Cache-Control: public, max-age=86400, stale-while-revalidate=604800`).
  - Implementado `subirImagen` de forma transaccional (creación de registro de archivo + actualización del producto) y `quitarImagen`.
  - Registrada la ruta pública de obtención y las rutas protegidas de administración para la subida/eliminación con validación de origen.
- **Pruebas de Integración (`producto-imagen.test.js`)**:
  - Creado un test suite integral con mocks de Google Drive que cubre todos los endpoints y validaciones (incluido tests de origen, permisos de admin, bytes mágicos falsos y manejo de errores 503).

### Verificación

| Test | Resultado |
|------|-----------|
| `npm test tests/producto-imagen.test.js` | ✅ Todos los 12 tests de imágenes pasan con éxito. |
| `npm test` | ✅ 13 suites y 199/199 tests pasan sin regresiones. |

## Fase B5.2 — Alineación de Schema, Seed, Stock e Harness de Testing (2026-06-06)

### Cambios aplicados

- **Base de datos (`schema.sql` y `seed.sql`)**:
  - Modificado el tipo de producto (`producto.tipo`) de `'combo'` a `'promo'` en el ENUM de base de datos.
  - Modificada la columna `pedido.numero` para permitir valores `NULL` y conservar la restricción de unicidad (`VARCHAR(20) NULL UNIQUE`). Esto soluciona los fallos de inserción inicial previa a la generación del código formateado `KMG-XXXX`.
  - Depurado `schema.sql` eliminando los índices redundantes duplicados que ya están definidos y controlados en `indexes.sql`.
  - Actualizados los combos semilla (`Combo merienda` y `Combo cena`) a tipo `'promo'`, estableciendo `stock_limitado = 0` y `stock_actual = NULL` (puesto que el stock de una promo depende de sus componentes).
  - Configurado `Pizza sin TACC` y `Helados palito` para arrancar con `stock_actual = 0` (agotados de inicio).
  - Corregido el comentario `-- Combos` a `-- Promos` en `seed.sql`.
- **Lógica de negocio (`pedido.model.js`)**:
  - Ajustado el proceso de descuento defensivo en `createWithTransaction` para omitir la actualización de productos ilimitados (`stock_limitado = 0`), evitando que retorne `affectedRows = 0` y lance un error falso de stock insuficiente.
  - Rediseñado el proceso de cancelación y reposición en `cancelWithTransaction` para prevenir deadlocks en la base de datos: se consultan las reposiciones sin bloqueo `FOR UPDATE` en el join inicial, se extraen y ordenan de manera determinista (ascendente) las IDs de producto, y se ejecuta el bloqueo `FOR UPDATE` en dicho orden antes de actualizar.
  - Ajustada la reposición de stock al cancelar para omitir productos ilimitados.
- **Seguridad (`auth.routes.js`)**:
  - Aplicado el middleware `requireTrustedOrigin` en la ruta `POST /api/auth/logout` para protegerla de ataques CSRF de cierre de sesión.
- **Entorno y Pruebas (`.env.example` y `package.json`)**:
  - Creado el archivo de plantilla `backend/.env.example` con todas las variables necesarias para el despliegue local del backend.
  - Añadidas las dependencias `jest` y `supertest` en `devDependencies` de `package.json`.
  - Añadido el test de salud de integración básico en `backend/tests/health.test.js` alineado con el formato de respuesta del API (`ok: true`).
- **Documentación y OpenSpec**:
  - Actualizada la documentación técnica e histórica en `docs/docs/estado-actual.md`, `docs/docs/mapa-archivos.md` y `docs/planificacion/05-BASE_DE_DATOS_MYSQL.md`, `docs/planificacion/13-FLUJOS_FUNCIONALES.md`.
  - Creados los entregables OpenSpec (`explore.md`, `proposal.md`, `spec.md`, `design.md`, `tasks.md`, `verify-report.md`) en la carpeta `openspec/changes/backend-b5-2-schema-seed-alignment/`.

### Verificación

| Test | Resultado |
|------|-----------|
| `npm install` | ✅ Completado sin vulnerabilidades críticas adicionales |
| `npm test` | ✅ Jest ejecutó con éxito el test de salud integrando supertest |
| Lógica stock ilimitado | ✅ Verificada en código (se salta la query de stock para `stock_limitado = 0`) |
| Bloqueo determinista | ✅ Implementado usando IDs ordenadas en cancelaciones preventivas |

## Fase 1 — Backend Base Scaffolding (2026-06-05)

### Cambios aplicados

- Creado scaffolding completo `backend/` como proyecto Express ESM standalone.
- 12 archivos creados:
  - `backend/package.json` — ESM (`type: module`), deps express/cors/cookie-parser/dotenv, dev nodemon
  - `backend/.env.example` — PORT=3001, NODE_ENV=development, FRONTEND_URL placeholder
  - `backend/.gitignore` — node_modules, .env, *.log
  - `backend/src/server.js` — entry point con dotenv + app.listen
  - `backend/src/app.js` — Express app factory con middleware global
  - `backend/src/api/routes/index.routes.js` — GET /api/health con envelope uniforme
  - `backend/src/api/config/environments.js` — config centralizada con Object.freeze
  - `backend/src/api/utils/respuesta.utils.js` — respuestaExitosa / respuestaError
  - `backend/src/api/utils/errors.js` — AppError + ValidationError + NotFoundError + AuthError
  - `backend/src/api/middlewares/error.middleware.js` — global error handler
  - `backend/src/api/controllers/.gitkeep` + `backend/src/api/models/.gitkeep` (MVC scaffold)
- Stack verificado: Express 4.21, ESM, 4 specs, 14 scenarios — todos PASS
- curl tests: GET /api/health → 200, POST /api/health → 404, /api/unknown → 404 ✅
- No `process.env` fuera de environments.js, no `res.json()` fuera de helpers ✅

### Verificación

| Test | Resultado |
|------|-----------|
| `npm install` | ✅ Sin errores |
| `npm run dev` | ✅ Servidor inicia en puerto 3001 |
| `GET /api/health` | ✅ 200 + envelope `{ ok: true, data: { status: "ok", timestamp: "..." } }` |
| `POST /api/health` | ✅ 404 + envelope `{ ok: false, error: "Ruta no encontrada" }` |
| `GET /api/unknown` | ✅ 404 + envelope uniforme |
| grep `process.env` | ✅ Solo en environments.js |
| grep `res.json(` | ✅ Solo en respuesta.utils.js |

---

## Fase 0 — Setup y preparación del proyecto (2026-06-04)

### Cambios aplicados

- Creada carpeta `frontend/` con copia del prototipo v0 desde `diseno-de-landing-kermingo/`.
- `diseno-de-landing-kermingo/` se conserva intacta como referencia visual.
- Instalado pnpm 11.5.1 vía `npm install -g pnpm --prefix ~/.local/`.
- Instaladas dependencias frontend (602 paquetes, Next.js 16.2.6).
- Agregado ESLint (`eslint`, `eslint-config-next`, `@eslint/eslintrc`) como devDependencies.
- Creado `eslint.config.mjs` para flat config de ESLint v10.
- Creado `.npmrc` con `onlyBuiltDependencies` para msw, sharp, unrs-resolver.
- Instaladas 13 skills externas desde skills.sh:
  - `vercel-labs/next-skills` (next-best-practices, next-cache-components, next-upgrade)
  - `vercel-labs/agent-skills` (vercel-composition-patterns, deploy-to-vercel, vercel-react-best-practices, vercel-react-native-skills, vercel-react-view-transitions, vercel-cli-with-tokens, vercel-optimize, web-design-guidelines, writing-guidelines)
  - `mattpocock/skills` (tdd)
- Sincronizadas skills locales a `.agents/skills/` (kermingo-backend-api, kermingo-frontend-v0, kermingo-verification).
- Ejecutado `gentle-ai skill-registry refresh --force` → 55 skills registradas.
- Creado `docs/docs/registro-skills.md` con clasificación completa de todas las skills.
- Build exitoso: ✅ `pnpm build` compila correctamente (Next.js 16.2.6 + Turbopack).
- Lint parcial: ESLint v10 tiene conflicto con `eslint-config-next` (circular structure error). El build funciona.

### Problemas detectados y estado

- ESLint: conflicto entre ESLint v10 y `eslint-config-next`. Build no está bloqueado.
- pnpm 11.5.1: políticas estrictas de build scripts resueltas con `.npmrc`.
- Engram: naming conflict entre `kermingo` y `entradas_kermingo`.

---

## Actualización documentación — referencia visual obligatoria

Se actualizó la documentación para reflejar que la carpeta:

```txt
/home/marcos/Escritorio/Kermingo/kermingo_menu/diseno-de-landing-kermingo
```

es la referencia visual obligatoria del frontend.

Cambios aplicados:

- Actualizado `AGENTS.md`.
- Actualizado índice maestro.
- Actualizada estructura real del proyecto.
- Agregado `25-REFERENCIA_VISUAL_FRONTEND.md`.
- Agregado `26-AGENTS_Y_SKILLS.md`.
- Reescritas tareas frontend detalladas con rutas reales.
- Reescritas tareas backend e integración para respetar estructura actual.
- Agregado script `docs/scripts/sincronizar_skills_a_raiz.sh`.
