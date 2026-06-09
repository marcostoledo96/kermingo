import { Router } from 'express';
import { respuestaExitosa } from '../utils/respuesta.utils.js';
import { publicRouter as productoPublicRouter, adminRouter as productoAdminRouter } from './producto.routes.js';
import { publicRouter as pedidoPublicRouter, adminRouter as pedidoAdminRouter } from './pedido.routes.js';
import authRouter from './auth.routes.js';
import cocinaRouter from './cocina.routes.js';
import { publicRouter as configuracionPublicRouter, adminRouter as configuracionAdminRouter } from './configuracion.routes.js';

const router = Router();

// ── Rutas de productos ──
router.use('/productos', productoPublicRouter);
router.use('/admin/productos', productoAdminRouter);

// ── Rutas de pedidos ──
router.use('/pedidos', pedidoPublicRouter);
router.use('/admin/pedidos', pedidoAdminRouter);

// ── Rutas de auth ──
router.use('/auth', authRouter);

// ── Rutas de cocina ──
router.use('/admin/cocina', cocinaRouter);

// ── Rutas de configuración ──
router.use('/configuracion-tienda', configuracionPublicRouter);
router.use('/admin/configuracion-tienda', configuracionAdminRouter);

// ── Health check ──
router.get('/health', (req, res) => {
  return respuestaExitosa(
    res,
    { status: 'ok', timestamp: new Date().toISOString() },
    'Servidor operativo'
  );
});

export default router;
