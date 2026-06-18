import { Router } from 'express';
import { requireAdmin } from '../middlewares/admin.middleware.js';
import { obtenerReportesAdmin } from '../controllers/reportes.controller.js';

const adminRouter = Router();

adminRouter.get('/', requireAdmin, obtenerReportesAdmin);

export { adminRouter };
