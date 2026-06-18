import { z } from 'zod';

export const updateConfiguracionSchema = z
  .object({
    // FIX retroactivo: `mensaje_publico` y `cena_habilitada_desde` son NULL
    // en DB. `.nullable()` permite enviar `null` explícito para limpiar;
    // `.optional()` permite omitir el campo (no se toca la columna).
    estado: z.enum(['abierta', 'cerrada', 'demo']).optional(),
    mensaje_publico: z.string().max(500).nullable().optional(),
    cena_habilitada_desde: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/, 'Formato esperado: HH:MM:SS')
      .nullable()
      .optional(),
    categoria_default: z.enum(['merienda', 'cena']).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'El cuerpo de la solicitud debe incluir al menos un campo',
  });
