import { Router } from 'express';
import { validateBody, validateQuery, validateParams } from '../middlewares/validate.middleware.js';
import { requireAdmin } from '../middlewares/admin.middleware.js';
import {
  createPedidoSchema,
  createCajaSchema,
  pedidoQuerySchema,
  updateEstadoPedidoSchema,
  updateEstadoPagoSchema,
  idParamSchema,
} from '../schemas/pedido.schema.js';
import {
  crear,
  crearCaja,
  seguimiento,
  listarAdmin,
  obtenerAdmin,
  cambiarEstado,
  cambiarPago,
  cancelar,
} from '../controllers/pedido.controller.js';

const publicRouter = Router();
const adminRouter = Router();

// ── Rutas públicas ──
publicRouter.post('/', validateBody(createPedidoSchema), crear);
publicRouter.get('/seguimiento/:token', seguimiento);

// ── Rutas admin ──
adminRouter.post('/caja', requireAdmin, validateBody(createCajaSchema), crearCaja);
adminRouter.get('/', requireAdmin, validateQuery(pedidoQuerySchema), listarAdmin);
adminRouter.get('/:id', requireAdmin, validateParams(idParamSchema), obtenerAdmin);
adminRouter.patch(
  '/:id/estado',
  requireAdmin,
  validateParams(idParamSchema),
  validateBody(updateEstadoPedidoSchema),
  cambiarEstado
);
adminRouter.patch(
  '/:id/pago',
  requireAdmin,
  validateParams(idParamSchema),
  validateBody(updateEstadoPagoSchema),
  cambiarPago
);
adminRouter.patch('/:id/cancelar', requireAdmin, validateParams(idParamSchema), cancelar);

export { publicRouter, adminRouter };
