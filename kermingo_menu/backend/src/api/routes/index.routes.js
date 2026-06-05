import { Router } from 'express';
import { respuestaExitosa } from '../utils/respuesta.utils.js';

const router = Router();

router.get('/health', (req, res) => {
  return respuestaExitosa(
    res,
    { status: 'ok', timestamp: new Date().toISOString() },
    'Servidor operativo'
  );
});

export default router;
