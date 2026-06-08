import { Router } from 'express';
import { validateBody } from '../middlewares/validate.middleware.js';
import { requireAdmin } from '../middlewares/admin.middleware.js';
import { updateConfiguracionSchema } from '../schemas/configuracion.schema.js';
import {
  obtenerPublico,
  obtenerAdmin,
  actualizarAdmin,
} from '../controllers/configuracion.controller.js';

const publicRouter = Router();
const adminRouter = Router();

publicRouter.get('/', obtenerPublico);

adminRouter.get('/', requireAdmin, obtenerAdmin);
adminRouter.put('/', requireAdmin, validateBody(updateConfiguracionSchema), actualizarAdmin);

export { publicRouter, adminRouter };
