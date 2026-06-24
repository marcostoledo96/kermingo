import { z } from 'zod';

export const productoQuerySchema = z.object({
  categoria: z.string().optional(),
  tipo: z.enum(['comida', 'bebida', 'promo']).optional(),
  buscar: z.string().max(50).optional(),
});

export const adminProductoQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
  estado: z.enum(['activo', 'inactivo', 'desactivado', 'agotado', 'todavia_no_disponible', 'todos']).optional(),
  tipo: z.enum(['comida', 'bebida', 'promo']).optional(),
});

export const createProductoSchema = z.object({
  nombre: z.string().min(1).max(120),
  descripcion: z.string().max(500).optional(),
  precio: z.coerce.number().min(0),
  tipo: z.enum(['comida', 'bebida', 'promo']),
  categorias: z.array(z.enum(['Merienda', 'Cena'])).min(1),
  stock_limitado: z.coerce.number().int().refine((v) => v === 0 || v === 1, {
    message: 'stock_limitado debe ser 0 o 1',
  }),
  stock_actual: z.coerce.number().int().min(0).optional(),
  stock_minimo_alerta: z.coerce.number().int().min(0).default(5),
  activo: z.coerce.number().int().refine((v) => v === 0 || v === 1).default(1),
  disponible: z.coerce.number().int().refine((v) => v === 0 || v === 1).default(1),
  orden: z.number().int().min(0).optional(),
}).strict();

export const updateProductoSchema = z.object({
  nombre: z.string().min(1).max(120).optional(),
  descripcion: z.string().max(500).optional(),
  precio: z.coerce.number().min(0).optional(),
  tipo: z.enum(['comida', 'bebida', 'promo']).optional(),
  categorias: z.array(z.enum(['Merienda', 'Cena'])).min(1).optional(),
  stock_limitado: z.coerce.number().int().refine((v) => v === 0 || v === 1, {
    message: 'stock_limitado debe ser 0 o 1',
  }).optional(),
  stock_actual: z.coerce.number().int().min(0).optional(),
  stock_minimo_alerta: z.coerce.number().int().min(0).optional(),
  activo: z.coerce.number().int().refine((v) => v === 0 || v === 1).optional(),
  disponible: z.coerce.number().int().refine((v) => v === 0 || v === 1).optional(),
  orden: z.number().int().min(0).optional(),
}).strict();

export const stockAdjustmentSchema = z.object({
  stock_actual: z.coerce.number().int().min(0),
}).strict();

export const reordenarSchema = z.object({
  ordenes: z.array(z.object({
    id: z.number().int().min(1),
    orden: z.number().int().min(0),
  })).min(1),
}).strict();

export const idParamSchema = z.object({
  id: z.coerce.number().int().min(1),
});

export const componentesSchema = z.object({
  componentes: z.array(
    z.object({
      producto_id: z.number().int().min(1),
      cantidad: z.number().int().min(1),
    })
  ),
}).strict();
