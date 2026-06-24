import { Router } from 'express';
import { validateBody, validateQuery, validateParams } from '../middlewares/validate.middleware.js';
import { requireAdmin } from '../middlewares/admin.middleware.js';
import { requireTrustedOrigin } from '../middlewares/origin.middleware.js';
import { uploadProductoImagen, assertProductImageMagicBytes, handleMulterError } from '../middlewares/upload.middleware.js';
import {
  productoQuerySchema,
  adminProductoQuerySchema,
  createProductoSchema,
  updateProductoSchema,
  stockAdjustmentSchema,
  reordenarSchema,
  idParamSchema,
  componentesSchema,
} from '../schemas/producto.schema.js';
import {
  listar,
  obtener,
  listarAdmin,
  crear,
  actualizar,
  desactivar,
  recuperar,
  ajustarStock,
  reordenar,
  obtenerImagen,
  subirImagen,
  quitarImagen,
  obtenerComponentes,
  setComponentesController,
} from '../controllers/producto.controller.js';

const publicRouter = Router();
const adminRouter = Router();

// ── Rutas públicas ──
publicRouter.get('/', validateQuery(productoQuerySchema), listar);
publicRouter.get('/:id/imagen', validateParams(idParamSchema), obtenerImagen);
publicRouter.get('/:id', validateParams(idParamSchema), obtener);

// ── Rutas admin ──
adminRouter.get('/', requireAdmin, validateQuery(adminProductoQuerySchema), listarAdmin);
adminRouter.patch('/orden', requireAdmin, requireTrustedOrigin, validateBody(reordenarSchema), reordenar);
adminRouter.post('/', requireAdmin, requireTrustedOrigin, validateBody(createProductoSchema), crear);
// Component routes MUST be before /:id to avoid route collision
adminRouter.get('/:id/componentes', requireAdmin, validateParams(idParamSchema), obtenerComponentes);
adminRouter.put('/:id/componentes', requireAdmin, requireTrustedOrigin, validateParams(idParamSchema), validateBody(componentesSchema), setComponentesController);
adminRouter.put('/:id', requireAdmin, requireTrustedOrigin, validateParams(idParamSchema), validateBody(updateProductoSchema), actualizar);
adminRouter.patch('/:id/desactivar', requireAdmin, requireTrustedOrigin, validateParams(idParamSchema), desactivar);
adminRouter.patch('/:id/recuperar', requireAdmin, requireTrustedOrigin, validateParams(idParamSchema), recuperar);
adminRouter.patch('/:id/stock', requireAdmin, requireTrustedOrigin, validateParams(idParamSchema), validateBody(stockAdjustmentSchema), ajustarStock);

adminRouter.post('/:id/imagen',
  requireAdmin,
  requireTrustedOrigin,
  validateParams(idParamSchema),
  uploadProductoImagen.single('imagen'),
  assertProductImageMagicBytes,
  subirImagen
);

adminRouter.delete('/:id/imagen',
  requireAdmin,
  requireTrustedOrigin,
  validateParams(idParamSchema),
  quitarImagen
);

export { publicRouter, adminRouter };
