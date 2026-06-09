import { z } from 'zod';

export const updateConfiguracionSchema = z.object({
  estado: z.enum(['abierta', 'cerrada', 'demo']),
  // FIX retroactivo: `mensaje_publico` y `cena_habilitada_desde` son NULL
  // en DB. `.nullable()` permite enviar `null` explícito para limpiar;
  // `.optional()` permite omitir el campo (no se toca la columna).
  mensaje_publico: z.string().max(500).nullable().optional(),
  cena_habilitada_desde: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/, 'Formato esperado: HH:MM:SS')
    .nullable()
    .optional(),
}).strict();
