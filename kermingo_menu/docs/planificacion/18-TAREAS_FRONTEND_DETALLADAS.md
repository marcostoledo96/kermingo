# 18 — Tareas frontend detalladas con checkpoints

## Regla crítica actualizada

La carpeta activa de frontend es:

```txt
/home/marcos/Escritorio/Kermingo/kermingo_menu/frontend
```

Dentro del repo:

```txt
frontend/
```

La carpeta de referencia visual obligatoria es:

```txt
/home/marcos/Escritorio/Kermingo/kermingo_menu/diseno-de-landing-kermingo
```

Dentro del repo:

```txt
diseno-de-landing-kermingo/
```

`diseno-de-landing-kermingo/` es solo lectura. No modificar.

## Leer siempre antes de frontend

```txt
AGENTS.md
docs/planificacion/00-INDICE-MAESTRO.md
docs/planificacion/07-FRONTEND_NEXTJS_V0.md
docs/planificacion/08-RUTAS_FRONTEND.md
docs/planificacion/10-CARRITO_LOCALSTORAGE.md
docs/planificacion/12-DISENO_VISUAL_V0.md
docs/planificacion/25-REFERENCIA_VISUAL_FRONTEND.md
docs/planificacion/27-CHECKPOINTS_TESTING_AUDITORIA.md
```

## Verificación base

```bash
cd /home/marcos/Escritorio/Kermingo/kermingo_menu/frontend
pnpm lint
pnpm build
```

Si se necesita mirar referencia:

```bash
cd /home/marcos/Escritorio/Kermingo/kermingo_menu/diseno-de-landing-kermingo
pnpm dev
```

No modificar referencia.

## Etapa F1 — Estabilizar frontend activo

### Leer

```txt
frontend/package.json
frontend/app/layout.tsx
frontend/app/page.tsx
frontend/app/globals.css
frontend/components/
diseno-de-landing-kermingo/app/page.tsx
diseno-de-landing-kermingo/app/globals.css
diseno-de-landing-kermingo/components/
```

### Qué hacer

- Confirmar que `frontend/` contiene la app activa.
- Comparar con `diseno-de-landing-kermingo/`.
- Documentar diferencias importantes.
- Corregir errores de build/lint si existen.
- No hacer rediseño grande.

### Testing manual requerido

Sí.

Pantallas a abrir:

- `/`
- `/menu`
- `/carrito`
- `/confirmar` o `/checkout`
- `/confirmado`
- `/seguimiento`
- `/admin`
- `/admin/dashboard`
- `/admin/productos`
- `/admin/pedidos`
- `/admin/caja`
- `/admin/cocina`

### Auditoría con ChatGPT recomendada

Sí si hubo cambios visuales o estructurales.

## Etapa F2 — Variables, tipos y cliente API

### Leer

```txt
frontend/package.json
frontend/tsconfig.json
frontend/next.config.mjs
docs/planificacion/06-ENDPOINTS_API.md
docs/planificacion/15-VARIABLES_ENTORNO.md
```

### Crear/modificar

```txt
frontend/.env.local.example
frontend/lib/env.ts
frontend/services/apiClient.ts
frontend/types/
frontend/services/
```

### Qué hacer

- Configurar `NEXT_PUBLIC_API_URL`.
- Crear cliente fetch con `credentials: "include"`.
- Crear tipos principales.
- No conectar todas las pantallas todavía.

### Testing manual requerido

No obligatorio visual, pero sí build/lint.

### Auditoría con ChatGPT recomendada

No, salvo errores grandes.

## Etapa F3 — Menú y carrito

### Leer referencia visual

```txt
diseno-de-landing-kermingo/app/menu/page.tsx
diseno-de-landing-kermingo/components/menu/
```

### Leer activo

```txt
frontend/app/menu/page.tsx
frontend/components/menu/
frontend/lib/
```

### Qué hacer

- Conectar menú a API.
- Mantener diseño v0.
- Mantener productos agotados visibles.
- Adaptar CartContext.
- Persistir carrito en localStorage.

### Testing manual requerido

Sí, obligatorio.

Probar:

- agregar producto
- quitar producto
- cambiar cantidad
- recargar
- mantener carrito
- producto agotado bloqueado

### Auditoría con ChatGPT recomendada

Sí si cambió mucho el carrito.

## Etapa F4 — Checkout y ticket

### Leer referencia visual

```txt
diseno-de-landing-kermingo/app/confirmar/page.tsx
diseno-de-landing-kermingo/app/confirmado/page.tsx
diseno-de-landing-kermingo/app/seguimiento/page.tsx
```

### Leer activo

```txt
frontend/app/confirmar/page.tsx
frontend/app/confirmado/page.tsx
frontend/app/seguimiento/page.tsx
frontend/components/
```

### Qué hacer

- Efectivo oculta comprobante.
- Transferencia muestra datos bancarios.
- Transferencia requiere comprobante.
- Enviar pedido al backend.
- Limpiar carrito al confirmar.
- Redirigir a ticket/seguimiento.
- Implementar jsPDF.

### Testing manual requerido

Sí, obligatorio.

### Auditoría con ChatGPT recomendada

Sí, por flujo crítico.

## Etapa F5 — Admin

### Leer referencia visual

```txt
diseno-de-landing-kermingo/app/admin/
diseno-de-landing-kermingo/components/admin/
```

### Leer activo

```txt
frontend/app/admin/
frontend/components/admin/
```

### Qué hacer

- Login real.
- Proteger rutas.
- Dashboard.
- Productos.
- Pedidos.
- Caja.
- Cocina.
- Comprobantes.
- Reportes.
- Configuración.

### Testing manual requerido

Sí, por cada pantalla conectada.

### Auditoría con ChatGPT recomendada

Sí al terminar admin conectado.

## Checkpoint obligatorio en frontend

Al finalizar cualquier etapa frontend, la IA debe responder:

```txt
Checkpoint automatico:
Testing manual requerido:
Auditoria con ChatGPT recomendada:
Bloquea avance:
Comparacion con referencia visual:
- archivos activos revisados:
- archivos referencia revisados:
- diferencias:
- capturas recomendadas:
```
