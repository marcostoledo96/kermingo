# AGENTS.md — Guía operativa para agentes IA en Kermingo

Este archivo es la fuente principal para cualquier agente IA que trabaje en este repositorio.

## 0. Regla crítica de estructura real

La estructura actual del proyecto se debe respetar. No renombrar carpetas ni mover el frontend visual sin autorización explícita de Marcos.

La carpeta de referencia visual obligatoria es:

```txt
/home/marcos/Escritorio/Kermingo/kermingo_menu/diseno-de-landing-kermingo
```

Dentro del repositorio, esa carpeta corresponde a:

```txt
diseno-de-landing-kermingo/
```

Esa carpeta contiene el prototipo de diseño generado en v0 y debe ser la base visual fuerte para todo el frontend.

## 1. Contexto del proyecto

Kermingo es un sistema web para un evento scout recaudatorio del campamento de verano.

- Nombre visible: **Kermingo**
- Fecha del evento: **20 de junio de 2026**
- Dirección: **Echeverría 3920**
- Temática: Argentina, Mundial de fútbol, Día de la Bandera, bingo, kermesse y toque scout sutil.
- Organizan: Grupo Scout San Patricio, Tropa Raider “Compañía de Jesús” y Comunidad Raider “Fortaleza de María”.
- Evento con venta de comida/bebida, bingo, kermesse, tradeo de figuritas y concurso de disfraces.

## 2. Arquitectura objetivo

```txt
kermingo_menu/
├── AGENTS.md
├── diseno-de-landing-kermingo/   # Frontend Next.js y referencia visual obligatoria
├── backend/                      # A crear: Express + MySQL + API REST + MVC
└── docs/
    ├── planificacion/
    ├── scripts/
    ├── docs/
    └── .agents/
```

Importante:

- El frontend actual no está en `frontend/`, sino en `diseno-de-landing-kermingo/`.
- Para Vercel, el **Root Directory** debe ser `diseno-de-landing-kermingo`.
- El backend se agregará como carpeta `backend/`.
- La documentación está en `docs/planificacion/`.
- No implementar EJS. El profesor autorizó React/Next.js para reemplazar el frontend.

## 3. Stack backend obligatorio

- Node.js
- Express
- MySQL con `mysql2/promise`
- ESM (`type: module`)
- MVC: routes → middlewares → controllers → models/services
- bcrypt
- JWT en cookie httpOnly
- cookie-parser
- cors con `credentials: true`
- Zod para validación
- Multer memoryStorage
- Google Drive API
- ExcelJS
- Jest + Supertest

## 4. Stack frontend obligatorio

- Next.js
- React
- TypeScript
- TailwindCSS
- v0 como base visual fuerte
- shadcn-style components si ya existen en el prototipo
- lucide-react
- jsPDF para ticket PDF
- localStorage para carrito
- Vitest + React Testing Library
- Playwright para E2E si se implementa

## 5. Fuente visual obligatoria

Antes de tocar frontend, inspeccionar esta carpeta:

```txt
/home/marcos/Escritorio/Kermingo/kermingo_menu/diseno-de-landing-kermingo
```

Archivos visuales clave actuales:

```txt
diseno-de-landing-kermingo/app/page.tsx
diseno-de-landing-kermingo/app/globals.css
diseno-de-landing-kermingo/app/layout.tsx
diseno-de-landing-kermingo/app/menu/page.tsx
diseno-de-landing-kermingo/app/carrito/page.tsx
diseno-de-landing-kermingo/app/confirmar/page.tsx
diseno-de-landing-kermingo/app/confirmado/page.tsx
diseno-de-landing-kermingo/app/seguimiento/page.tsx
diseno-de-landing-kermingo/app/admin/page.tsx
diseno-de-landing-kermingo/app/admin/dashboard/page.tsx
diseno-de-landing-kermingo/app/admin/productos/page.tsx
diseno-de-landing-kermingo/app/admin/pedidos/page.tsx
diseno-de-landing-kermingo/app/admin/caja/page.tsx
diseno-de-landing-kermingo/app/admin/cocina/page.tsx
diseno-de-landing-kermingo/components/header.tsx
diseno-de-landing-kermingo/components/hero.tsx
diseno-de-landing-kermingo/components/cta-buttons.tsx
diseno-de-landing-kermingo/components/event-info.tsx
diseno-de-landing-kermingo/components/activities.tsx
diseno-de-landing-kermingo/components/footer.tsx
diseno-de-landing-kermingo/components/menu/menu-screen.tsx
diseno-de-landing-kermingo/components/menu/product-card.tsx
diseno-de-landing-kermingo/components/menu/cart-context.tsx
diseno-de-landing-kermingo/components/admin/dashboard-screen.tsx
diseno-de-landing-kermingo/components/admin/caja-screen.tsx
diseno-de-landing-kermingo/components/admin/cocina-screen.tsx
```

Reglas:

- No rediseñar desde cero.
- No convertir la home en dashboard.
- No cambiar el ADN visual sin pedido explícito.
- Mantener la estética v0: Argentina, Mundial, Día de la Bandera, scout sutil, cards redondeadas, fondo claro, azul/celeste/amarillo, mobile-first.
- Mejorar lo existente, no destruirlo.
- El dashboard admin puede mejorarse porque Marcos dijo que es la pantalla que menos lo convence.

## 6. Documentación a leer según tarea

### Siempre leer primero

```txt
AGENTS.md
docs/planificacion/00-INDICE-MAESTRO.md
docs/planificacion/25-REFERENCIA_VISUAL_FRONTEND.md
```

### Backend

```txt
docs/planificacion/04-BACKEND_API_EXPRESS_MYSQL.md
docs/planificacion/05-BASE_DE_DATOS_MYSQL.md
docs/planificacion/06-ENDPOINTS_API.md
docs/planificacion/09-AUTH_COOKIES_CORS.md
docs/planificacion/11-GOOGLE_DRIVE_ARCHIVOS.md
docs/planificacion/17-TAREAS_BACKEND_DETALLADAS.md
```

### Frontend

```txt
docs/planificacion/07-FRONTEND_NEXTJS_V0.md
docs/planificacion/08-RUTAS_FRONTEND.md
docs/planificacion/10-CARRITO_LOCALSTORAGE.md
docs/planificacion/12-DISENO_VISUAL_V0.md
docs/planificacion/18-TAREAS_FRONTEND_DETALLADAS.md
docs/planificacion/25-REFERENCIA_VISUAL_FRONTEND.md
```

### Integración/deploy

```txt
docs/planificacion/13-FLUJOS_FUNCIONALES.md
docs/planificacion/14-DEPLOY_RAILWAY_VERCEL.md
docs/planificacion/15-VARIABLES_ENTORNO.md
docs/planificacion/16-TESTING.md
docs/planificacion/19-TAREAS_INTEGRACION_DEPLOY_DETALLADAS.md
```

## 7. Reglas funcionales no negociables

- Tablas y campos técnicos en español, singular, sin tildes.
- Endpoints en español.
- No implementar roles separados por ahora.
- Habrá un usuario admin inicial, escalable a más usuarios.
- Todos los usuarios admin logueados pueden hacer todo.
- Pago online: transferencia o efectivo.
- Si elige transferencia, comprobante obligatorio.
- Si elige efectivo, no mostrar ni enviar comprobante.
- Caja rápida puede marcar efectivo como pagado automáticamente.
- Caja rápida puede marcar transferencia como pagada sin comprobante si el vendedor la verificó.
- El teléfono se guarda como `VARCHAR`, con campo original y campo normalizado para WhatsApp.
- El carrito debe persistir en `localStorage`.
- El stock se descuenta al confirmar pedido.
- Si se cancela un pedido, se repone stock.
- No pedir motivo obligatorio al cancelar.
- Los combos son reales y descuentan stock de sus productos internos.
- Comprobantes entran en MVP.
- El backend debe validar todo aunque el frontend ya valide.

## 8. Forma de trabajo obligatoria

1. Leer `AGENTS.md`.
2. Leer el documento de planificación de la etapa.
3. Leer los archivos fuente indicados en la tarea.
4. Hacer un plan corto antes de modificar.
5. Modificar como máximo 1 a 3 archivos relacionados por subtarea.
6. Ejecutar verificación real.
7. No decir “terminado” sin evidencia.
8. Actualizar documentación de estado si corresponde.

## 9. Comandos esperados

### Frontend actual

```bash
cd /home/marcos/Escritorio/Kermingo/kermingo_menu/diseno-de-landing-kermingo
pnpm install
pnpm dev
pnpm lint
pnpm build
```

### Backend futuro

```bash
cd /home/marcos/Escritorio/Kermingo/kermingo_menu/backend
npm install
npm run dev
npm test
```

## 10. Verificación mínima por tipo de cambio

### Backend

- `npm test` si hay tests.
- `GET /api/health` si se tocó servidor.
- Probar endpoint con Postman/curl si se creó o modificó una ruta.
- Verificar que no se filtren datos sensibles.

### Frontend

- `pnpm lint`
- `pnpm build`
- probar pantalla en navegador
- verificar mobile responsive
- verificar estados loading/error/empty
- comparar visualmente contra `diseno-de-landing-kermingo`

### Integración

- compra efectivo completa
- compra transferencia completa
- login admin
- caja rápida
- cocina
- cancelación con reposición de stock

## 11. Skills

Las skills locales están actualmente en:

```txt
docs/.agents/skills/
```

Si OpenCode no las detecta desde esa ubicación, copiarlas a la raíz:

```txt
.agents/skills/
```

Se incluye script auxiliar:

```bash
bash docs/scripts/sincronizar_skills_a_raiz.sh
```

## 12. Criterio de finalización

Una tarea no está terminada hasta que exista:

- código aplicado
- verificación ejecutada
- resultado leído
- documentación actualizada si corresponde
- resumen claro de archivos modificados
