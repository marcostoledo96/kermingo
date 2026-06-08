import { Router } from 'express';
import { validateBody } from '../middlewares/validate.middleware.js';
import { loginSchema } from '../schemas/auth.schema.js';
import { requireAdmin } from '../middlewares/admin.middleware.js';
import { requireTrustedOrigin } from '../middlewares/origin.middleware.js';
import { login, logout, me } from '../controllers/auth.controller.js';

const router = Router();

router.post('/login', validateBody(loginSchema), login);
router.post('/logout', requireTrustedOrigin, logout);
router.get('/me', requireAdmin, me);

export default router;
