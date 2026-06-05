import dotenv from 'dotenv';

dotenv.config();

const port = process.env.PORT || 3001;
const nodeEnv = process.env.NODE_ENV || 'development';
const esProduccion = nodeEnv === 'production';
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

const entorno = {
  port,
  nodeEnv,
  esProduccion,
  frontendUrl,
  cors: {
    origin: frontendUrl,
    credentials: true,
  },
  db: {
    host: process.env.DB_HOST || '',
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || '',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'kermingo-dev-secret-cambia-en-produccion',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
};

if (esProduccion) {
  const requeridos = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'];
  const faltantes = requeridos.filter((key) => !process.env[key]);
  if (faltantes.length > 0) {
    throw new Error(
      `Variables de entorno críticas faltantes en producción: ${faltantes.join(', ')}`
    );
  }
}

export default Object.freeze(entorno);
