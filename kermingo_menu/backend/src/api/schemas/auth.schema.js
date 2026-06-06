import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  contrasenia: z.string().min(1, 'Contraseña requerida'),
}).strict();
