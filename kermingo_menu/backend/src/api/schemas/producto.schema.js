import { z } from 'zod';

export const productoQuerySchema = z.object({
  categoria: z.string().optional(),
  tipo: z.enum(['comida', 'bebida', 'promo']).optional(),
  buscar: z.string().max(50).optional(),
});

export const adminProductoQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
  estado: z.enum(['activo', 'inactivo']).optional(),
  tipo: z.enum(['comida', 'bebida', 'promo']).optional(),
});

export const createProductoSchema = z.object({
  nombre: z.string().min(1).max(120),
  descripcion: z.string().max(500).optional(),
  precio: z.coerce.number().min(0),
  tipo: z.enum(['comida', 'bebida', 'promo']),
  stock_limitado: z.coerce.number().int().refine((v) => v === 0 || v === 1, {
    message: 'stock_limitado debe ser 0 o 1',
  }),
  stock_actual: z.coerce.number().int().min(0).optional(),
  stock_minimo_alerta: z.coerce.number().int().min(0).default(5),
  activo: z.coerce.number().int().refine((v) => v === 0 || v === 1).default(1),
}).strict();

export const updateProductoSchema = createProductoSchema.partial().strict();

export const stockAdjustmentSchema = z.object({
  stock_actual: z.coerce.number().int().min(0),
}).strict();

export const idParamSchema = z.object({
  id: z.coerce.number().int().min(1),
});
