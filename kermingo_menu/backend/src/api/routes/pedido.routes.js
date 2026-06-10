import { Router } from 'express';
import { validateBody, validateQuery, validateParams } from '../middlewares/validate.middleware.js';
import { requireAdmin } from '../middlewares/admin.middleware.js';
import { requireTrustedOrigin } from '../middlewares/origin.middleware.js';
import { uploadComprobante, assertMagicBytes } from '../middlewares/upload.middleware.js';
import {
  createPedidoSchema,
  createCajaSchema,
  pedidoQuerySchema,
  updateEstadoPedidoSchema,
  updateEstadoPagoSchema,
  editPedidoSchema,
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
  editar,
  obtenerComprobante,
} from '../controllers/pedido.controller.js';

const publicRouter = Router();
const adminRouter = Router();

// ── Rutas públicas ──
// uploadComprobante is optional — multer will skip if no file is present
// assertMagicBytes validates file content via magic bytes after Multer and before controller
publicRouter.post('/', uploadComprobante.single('comprobante'), validateBody(createPedidoSchema), assertMagicBytes, crear);
publicRouter.get('/seguimiento/:token', seguimiento);

// ── Rutas admin ──
adminRouter.post('/caja', requireAdmin, requireTrustedOrigin, validateBody(createCajaSchema), crearCaja);
adminRouter.get('/', requireAdmin, validateQuery(pedidoQuerySchema), listarAdmin);
adminRouter.get('/:id/comprobante', requireAdmin, validateParams(idParamSchema), obtenerComprobante);
adminRouter.get('/:id', requireAdmin, validateParams(idParamSchema), obtenerAdmin);
adminRouter.patch(
  '/:id/estado',
  requireAdmin,
  requireTrustedOrigin,
  validateParams(idParamSchema),
  validateBody(updateEstadoPedidoSchema),
  cambiarEstado
);
adminRouter.patch(
  '/:id/pago',
  requireAdmin,
  requireTrustedOrigin,
  validateParams(idParamSchema),
  validateBody(updateEstadoPagoSchema),
  cambiarPago
);
adminRouter.patch('/:id/cancelar', requireAdmin, requireTrustedOrigin, validateParams(idParamSchema), cancelar);
adminRouter.put(
  '/:id',
  requireAdmin,
  requireTrustedOrigin,
  validateParams(idParamSchema),
  validateBody(editPedidoSchema),
  editar
);

export { publicRouter, adminRouter };
