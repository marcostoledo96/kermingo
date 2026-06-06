# 29 — Prompt para auditoría con ChatGPT

Usar este prompt cuando Marcos quiera pasar el ZIP del proyecto a ChatGPT para revisar si hay errores, recomendaciones o mejoras.

## Cómo preparar el ZIP

Crear un ZIP sin:

```txt
node_modules/
.next/
.env
.env.local
backend/credentials/
drive-credentials.json
coverage/
dist/
```

Incluir:

```txt
AGENTS.md
backend/package.json
backend/.env.example
backend/src/
backend/tests/
frontend/package.json
frontend/.env.local.example
frontend/app/
frontend/components/
frontend/lib/
frontend/services/
frontend/types/
frontend/public/
docs/
openspec/ si existe
```

## Prompt base

```txt
Sos un arquitecto de software senior, QA técnico y project manager. Te paso el ZIP actual de mi proyecto Kermingo para que lo audites.

Contexto:
Kermingo es un sistema web para un evento scout recaudatorio del 20 de junio de 2026. El frontend activo está en frontend/. La carpeta diseno-de-landing-kermingo/ es solo referencia visual generada con v0 y no debe modificarse. El backend está en backend/.

Stack:
- Backend: Node.js, Express, MySQL, API REST, MVC, ESM, bcrypt, JWT en cookie httpOnly, CORS con credentials, Zod, Multer memoryStorage, Google Drive API, ExcelJS, Jest + Supertest.
- Frontend: Next.js, React, TypeScript, TailwindCSS, localStorage para carrito, jsPDF, Vitest/React Testing Library, Playwright si corresponde.
- Deploy: frontend en Vercel, backend y MySQL en Railway, archivos en Google Drive.

Quiero que revises:
1. Si la estructura respeta la planificación.
2. Si frontend/ está bien tratado como carpeta activa.
3. Si diseno-de-landing-kermingo/ se mantiene como referencia visual de solo lectura.
4. Si AGENTS.md y docs/planificacion están alineados.
5. Si hay contradicciones entre documentación y código.
6. Si el backend sigue una arquitectura MVC clara.
7. Si las rutas y endpoints están bien pensados.
8. Si hay problemas de seguridad, CORS, cookies o envs.
9. Si hay errores de base de datos o relaciones.
10. Si el frontend mantiene el diseño esperado.
11. Si falta testing automático o manual.
12. Si hay riesgos para el evento real.
13. Qué mejoras harías antes de pasar a la siguiente etapa.

Formato de respuesta:
- Resumen ejecutivo
- Errores críticos
- Errores importantes
- Mejoras recomendadas
- Buenas decisiones detectadas
- Checklist de corrección
- Preguntas que debería responder antes de seguir
```

## Prompt para auditoría de etapa 1

```txt
Auditá especialmente la Etapa 1 ya terminada. Quiero saber si el setup del backend, frontend, documentación, skills y estructura están correctos antes de seguir con la siguiente etapa. No necesito que modifiques código, solo diagnóstico y recomendaciones.
```

## Prompt para auditoría de base de datos

```txt
Auditá especialmente el diseño de base de datos MySQL. Revisá normalización, relaciones muchos-a-muchos, combos, pedido_detalle, stock, comprobantes, estados, índices y posibles race conditions. Decime si las tablas están bien o si conviene corregir algo antes de implementar más endpoints.
```

## Prompt para auditoría de stock/pedidos

```txt
Auditá especialmente el flujo de pedidos y stock. Revisá transacciones, stock insuficiente, combos, cancelación con reposición, pedido_detalle, estados de pedido/pago y posibles compras simultáneas. Quiero evitar sobreventa durante el evento.
```

## Prompt para auditoría frontend

```txt
Auditá especialmente frontend/. Verificá si respeta la referencia visual de diseno-de-landing-kermingo/, si mantiene mobile-first, si no rompió el diseño de v0, si las rutas están bien, si el carrito y checkout son claros, y qué mejoras UI/UX recomendarías.
```

## Prompt para auditoría deploy

```txt
Auditá especialmente deploy Vercel + Railway. Revisá variables de entorno, CORS, cookies cross-site, seguridad, conexión MySQL, Google Drive, uploads y posibles errores típicos en producción.
```
