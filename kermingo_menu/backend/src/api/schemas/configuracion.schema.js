import { z } from 'zod';

export const updateConfiguracionSchema = z.object({
  estado: z.enum(['abierta', 'cerrada', 'demo']),
  mensaje_publico: z.string().max(500).optional(),
  cena_habilitada_desde: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/, 'Formato esperado: HH:MM:SS')
    .optional(),
}).strict();
