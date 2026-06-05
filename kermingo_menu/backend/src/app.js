import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import environments from './api/config/environments.js';
import indexRoutes from './api/routes/index.routes.js';
import { NotFoundError } from './api/utils/errors.js';
import { respuestaError } from './api/utils/respuesta.utils.js';
import errorMiddleware from './api/middlewares/error.middleware.js';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors(environments.cors));
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.use('/api', indexRoutes);

app.use((req, res, next) => {
  next(new NotFoundError('Ruta no encontrada'));
});

app.use(errorMiddleware);

export default app;
