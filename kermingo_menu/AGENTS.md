# AGENTS.md — Guía operativa para agentes IA en Kermingo

Este archivo es la fuente principal para cualquier agente IA que trabaje en este repositorio.

## 0. Regla crítica de estructura real

La estructura actual del proyecto se debe respetar. No renombrar carpetas ni mover el frontend sin autorización explícita de Marcos.

La carpeta activa de frontend, donde SÍ se trabaja, es:

```txt
/home/marcos/Escritorio/Kermingo/kermingo_menu/frontend
```

Dentro del repositorio, esa carpeta corresponde a:

```txt
frontend/
```

La carpeta de referencia visual obligatoria, que NO se modifica, es:

```txt
/home/marcos/Escritorio/Kermingo/kermingo_menu/diseno-de-landing-kermingo
```

Dentro del repositorio, esa carpeta corresponde a:

```txt
diseno-de-landing-kermingo/
```

`diseno-de-landing-kermingo/` contiene el prototipo generado con v0. Se puede leer, comparar, tomar ideas y copiar patrones de diseño con cuidado, pero no se debe modificar. Todo desarrollo real del frontend debe hacerse en `frontend/`.

## 1. Contexto del proyecto

Kermingo es un sistema web para un evento scout recaudatorio del campamento de verano.

- Nombre visible: **Kermingo**
- Fecha del evento: **20 de junio de 2026**
- Dirección: **Estomba 1980**
- Temática: Argentina, Mundial de fútbol, Día de la Bandera, bingo, kermesse y toque scout sutil.
- Organizan: Grupo Scout San Patricio, Tropa Raider “Compañía de Jesús” y Comunidad Raider “Fortaleza de María”.
- Evento con venta de comida/bebida, bingo, kermesse, tradeo de figuritas y concurso de disfraces.

## 2. Arquitectura objetivo

```txt
kermingo_menu/
├── AGENTS.md
├── backend/                      # Express + MySQL + API REST + MVC
├── frontend/                     # Frontend activo Next.js + React + TypeScript + TailwindCSS
├── diseno-de-landing-kermingo/   # Referencia visual v0 de solo lectura
├── docs/
│   └── planificacion/
├── scripts/
├── openspec/
└── .agents/
```

Importante:

- El frontend activo es `frontend/`.
- La referencia visual es `diseno-de-landing-kermingo/`.
- Para Vercel, el **Root Directory** debe ser `frontend`.
- El backend está en `backend/`.
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
- v0 como referencia visual fuerte
- `frontend/` como carpeta activa de desarrollo
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

Archivos visuales de referencia:

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
diseno-de-landing-kermingo/components/
diseno-de-landing-kermingo/components/admin/
diseno-de-landing-kermingo/components/menu/
```

Reglas:

- No modificar `diseno-de-landing-kermingo/`.
- No rediseñar desde cero.
- No convertir la home en dashboard.
- No cambiar el ADN visual sin pedido explícito.
- Mantener la estética v0: Argentina, Mundial, Día de la Bandera, scout sutil, cards redondeadas, fondo claro, azul/celeste/amarillo, mobile-first.
- Implementar y mejorar en `frontend/`, no en la carpeta de referencia.
- El dashboard admin puede mejorarse porque Marcos dijo que es la pantalla que menos lo convence.

## 6. Documentación de referencia (fuente de verdad)

> La documentación del sistema vive en `DOCUMENTACION/IA/`.
> Leer el doc correspondiente **ANTES** de escribir código en esa área.
> El `sdd-archive` debe mantener estos docs al día al cerrar un change.
>
> **La estructura no es rígida**: los 14 archivos actuales son un punto de partida
> inspirado en PaginaGrupo, no una plantilla obligatoria. Si el proyecto necesita
> fusionar, partir o reorganizar docs, se hace y se actualiza el `INDEX.md`.
> Lo importante es que cada pregunta que un agente IA pueda hacerse tenga un doc
> que la responda.

### Siempre leer primero

| Pregunta | Archivo |
|----------|---------|
| ¿Dónde está cada doc y cuándo leerlo? | `DOCUMENTACION/IA/INDEX.md` |

### Arquitectura y stack

| Pregunta que responde | Archivo |
|-----------------------|---------|
| ¿Cómo está organizado el proyecto? ¿Qué carpetas y capas existen? | `DOCUMENTACION/IA/ARQUITECTURA.md` |
| ¿Cómo funciona cada endpoint HTTP? ¿Qué hace cada controller? | `DOCUMENTACION/IA/API.md` |
| ¿Cómo funciona la lógica de negocio? ¿State machines, reglas de stock, combos? | `DOCUMENTACION/IA/CORE.md` |
| ¿Cómo está la base de datos? ¿Pool, seed, tablas? | `DOCUMENTACION/IA/INFRA.md` |
| ¿Cómo está armado el frontend? ¿Rutas, componentes, carrito? | `DOCUMENTACION/IA/WEBAPP.md` |

### Auth y seguridad

| Pregunta que responde | Archivo |
|-----------------------|---------|
| ¿Cómo funciona JWT, cookies, requireAdmin, CSRF? | `DOCUMENTACION/IA/AUTENTICACION.md` |

### Funcionalidad y dominio

| Pregunta que responde | Archivo |
|-----------------------|---------|
| ¿Qué puede hacer cada rol? ¿Qué funcionalidades existen? | `DOCUMENTACION/IA/FUNCIONALIDADES.md` |
| ¿Cómo es un flujo de punta a punta? | `DOCUMENTACION/IA/FLUJOS.md` |
| ¿Qué significa este término? | `DOCUMENTACION/IA/GLOSARIO.md` |

### Infraestructura y operaciones

| Pregunta que responde | Archivo |
|-----------------------|---------|
| ¿Cómo hacer el deploy? ¿Qué variables de entorno van? | `DOCUMENTACION/IA/DEPLOY.md` |
| ¿Cómo correr los tests? ¿Cómo estructurar uno nuevo? | `DOCUMENTACION/IA/TESTING.md` |
| ¿Dónde están las credenciales y API keys? | `DOCUMENTACION/IA/SECRETS.md` |

### Errores y decisiones

| Pregunta que responde | Archivo |
|-----------------------|---------|
| ¿Hay bugs o trampas conocidas? | `DOCUMENTACION/IA/GOTCHAS.md` |

### Documentos de planificación (complementarios)

Estos docs en `docs/planificacion/` tienen las decisiones de planeamiento originales y las auditorías. Consultarlos para contexto histórico, no como fuente de verdad actual.

```txt
docs/planificacion/00-INDICE-MAESTRO.md
docs/planificacion/27-CHECKPOINTS_TESTING_AUDITORIA.md
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
3. Leer `docs/planificacion/27-CHECKPOINTS_TESTING_AUDITORIA.md`.
4. Leer los archivos fuente indicados en la tarea.
5. Hacer un plan corto antes de modificar.
6. Modificar como máximo 1 a 3 archivos relacionados por subtarea.
7. Ejecutar verificación real.
8. Indicar si corresponde testing manual.
9. Indicar si corresponde auditoría con ChatGPT.
10. No decir “terminado” sin evidencia.
11. Actualizar documentación de estado si corresponde.

## 9. Comandos esperados

### Frontend activo

```bash
cd /home/marcos/Escritorio/Kermingo/kermingo_menu/frontend
pnpm install
pnpm dev
pnpm lint
pnpm build
```

### Referencia visual, solo lectura

```bash
cd /home/marcos/Escritorio/Kermingo/kermingo_menu/diseno-de-landing-kermingo
pnpm dev
```

Solo usar para mirar/comparar. No modificar.

### Backend

```bash
cd /home/marcos/Escritorio/Kermingo/kermingo_menu/backend
npm install
npm run dev
npm test
```

## 10. Checkpoints obligatorios

Al finalizar cada etapa importante, el agente debe indicar uno de estos estados:

```txt
Checkpoint automatico: listo
Checkpoint manual requerido: si/no
Auditoria con ChatGPT recomendada: si/no
Bloquea avance a siguiente etapa: si/no
```

Si el checkpoint manual o auditoría bloquea avance, no se debe continuar hasta que Marcos confirme.

Ver detalles en:

```txt
docs/planificacion/27-CHECKPOINTS_TESTING_AUDITORIA.md
docs/planificacion/28-CHECKLIST_MANUAL_TESTING.md
docs/planificacion/29-PROMPT_AUDITORIA_CHATGPT.md
```
