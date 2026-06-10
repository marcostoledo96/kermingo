import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import environments from './api/config/environments.js';
import indexRoutes from './api/routes/index.routes.js';
import { NotFoundError } from './api/utils/errors.js';
import { respuestaError } from './api/utils/respuesta.utils.js';
import errorMiddleware from './api/middlewares/error.middleware.js';
import { handleMulterError } from './api/middlewares/upload.middleware.js';

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(cors(environments.cors));

// Request logging — skip in production or when DISABLE_REQUEST_LOG is set
if (!environments.esProduccion && !process.env.DISABLE_REQUEST_LOG) {
  app.use((req, _res, next) => {
    // Use req.path (no query string) instead of req.url (includes query params)
    // to avoid logging sensitive tokens in query strings
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

app.use('/api', indexRoutes);

app.use((req, res, next) => {
  next(new NotFoundError('Ruta no encontrada'));
});

// Multer error handler must come before generic error middleware
app.use(handleMulterError);

app.use(errorMiddleware);

export default app;