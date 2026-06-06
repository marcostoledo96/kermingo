# 28 — Checklist de testing manual

Este archivo sirve para que Marcos pruebe manualmente el sistema después de cada etapa importante.

## Cómo usarlo

1. La IA termina una etapa.
2. La IA indica “Testing manual requerido: sí”.
3. Marcos ejecuta los pasos de este checklist.
4. Si algo falla, se corrige antes de avanzar.
5. Si todo pasa, Marcos autoriza la siguiente etapa.

## Checklist general rápido

### Backend

```bash
cd /home/marcos/Escritorio/Kermingo/kermingo_menu/backend
npm install
npm run dev
```

Probar:

```txt
GET /api/health
```

Verificar:

- responde JSON
- no muestra stacktrace al usuario
- no rompe si falta alguna variable opcional
- `.env.example` está actualizado

### Frontend activo

```bash
cd /home/marcos/Escritorio/Kermingo/kermingo_menu/frontend
pnpm install
pnpm dev
pnpm lint
pnpm build
```

Verificar:

- abre en navegador
- no hay errores rojos en consola
- mobile responsive
- no se modificó `diseno-de-landing-kermingo/`

### Referencia visual

```bash
cd /home/marcos/Escritorio/Kermingo/kermingo_menu/diseno-de-landing-kermingo
pnpm dev
```

Usar solo para comparar diseño.

## Checklist visual frontend

Para cada pantalla:

- ¿Se parece al diseño de v0?
- ¿Respeta colores Kermingo?
- ¿Se ve bien en mobile?
- ¿Tiene botones grandes?
- ¿No parece dashboard si es pantalla pública?
- ¿No hay textos genéricos de IA?
- ¿Aparecen Grupo Scout San Patricio y unidades donde corresponde?
- ¿Se entiende qué hacer?
- ¿La pantalla carga sin errores?

## Checklist carrito

- Agregar producto.
- Quitar producto.
- Cambiar cantidad.
- Ver total.
- Recargar página y verificar que persiste.
- Vaciar carrito.
- Agregar producto agotado debe estar bloqueado.
- Ir a checkout y volver sin perder carrito.

## Checklist checkout

### Efectivo

- Seleccionar efectivo.
- Ver que no aparece comprobante.
- Confirmar pedido.
- Ver ticket.

### Transferencia

- Seleccionar transferencia.
- Ver datos bancarios.
- Ver upload de comprobante.
- Intentar confirmar sin comprobante: debe bloquear.
- Subir imagen.
- Subir PDF.
- Confirmar pedido.
- Ver ticket.

## Checklist admin

- Login válido.
- Login inválido.
- Logout.
- Acceder a ruta protegida sin login.
- Crear producto.
- Editar producto.
- Desactivar producto.
- Recuperar producto.
- Ajustar stock.
- Ver pedidos.
- Cambiar estado.
- Cambiar pago.
- Cancelar pedido.

## Checklist caja

- Cargar venta con nombre mínimo.
- Elegir efectivo.
- Confirmar.
- Ver número de pedido.
- Confirmar que baja stock.
- Confirmar que aparece en cocina.

## Checklist cocina

- Ver pedidos recibidos.
- Cambiar a en preparación.
- Cambiar a listo.
- Cambiar a entregado.
- Ver productos pendientes agrupados.
- Probar polling con dos ventanas.

## Checklist reportes

- Descargar Excel ventas.
- Descargar Excel productos vendidos.
- Descargar resumen.
- Abrir archivos.
- Verificar totales.
- Verificar efectivo/transferencia.
- Verificar que cancelados no suman.

## Checklist deploy

- Frontend Vercel carga.
- Backend Railway health responde.
- Frontend llama backend.
- CORS no falla.
- Cookies admin funcionan.
- Login funciona.
- Compra online funciona.
- Caja funciona.
- Cocina funciona.
- Comprobante funciona.
- Reportes funcionan.
