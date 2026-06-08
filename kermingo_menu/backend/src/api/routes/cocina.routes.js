import { Router } from 'express';
import { validateBody, validateParams } from '../middlewares/validate.middleware.js';
import { requireAdmin } from '../middlewares/admin.middleware.js';
import { requireTrustedOrigin } from '../middlewares/origin.middleware.js';
import { updateEstadoPedidoCocinaSchema, idParamSchema } from '../schemas/cocina.schema.js';
import {
  listarCocina,
  obtenerCocina,
  cambiarEstadoCocina,
} from '../controllers/cocina.controller.js';

const router = Router();

router.get('/pedidos', requireAdmin, listarCocina);
router.get('/pedidos/:id', requireAdmin, validateParams(idParamSchema), obtenerCocina);
router.patch(
  '/pedidos/:id/estado',
  requireAdmin,
  requireTrustedOrigin,
  validateParams(idParamSchema),
  validateBody(updateEstadoPedidoCocinaSchema),
  cambiarEstadoCocina
);

export default router;
