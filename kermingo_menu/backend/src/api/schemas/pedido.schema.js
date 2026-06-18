import { z } from 'zod';

const itemSchema = z.object({
  producto_id: z.coerce.number().int().min(1),
  cantidad: z.coerce.number().int().min(1),
}).strict();

export const createPedidoSchema = z.object({
  nombre_cliente: z.string().min(1).max(150),
  mesa: z.string().max(20).optional(),
  telefono_cliente: z.string().max(40).optional(),
  observaciones: z.string().max(500).optional(),
  metodo_pago: z.enum(['transferencia', 'efectivo']),
  items: z
    .preprocess((val) => {
      // Multer form-data sends fields as strings; parse JSON if needed
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch { return val; }
      }
      return val;
    }, z.array(itemSchema).min(1, 'Al menos un producto requerido')),
}).strict();

export const createCajaSchema = createPedidoSchema.extend({
  estado_pago: z.enum(['pendiente', 'pagado']).optional(),
  estado_pedido: z
    .enum(['recibido', 'en_preparacion', 'listo', 'entregado'])
    .default('en_preparacion'),
});

export const pedidoQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
  estado_pedido: z
    .enum(['recibido', 'en_preparacion', 'listo', 'entregado', 'cancelado'])
    .optional(),
  estado_pago: z
    .enum(['pendiente', 'comprobante_subido', 'pagado', 'rechazado'])
    .optional(),
  metodo_pago: z.enum(['transferencia', 'efectivo']).optional(),
  origen: z.enum(['online', 'caja']).optional(),
  buscar: z.string().max(50).optional(),
  solo_pagos_pendientes: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
}).strict();

export const updateEstadoPedidoSchema = z.object({
  estado_pedido: z.enum([
    'recibido',
    'en_preparacion',
    'listo',
    'entregado',
  ]),
}).strict();

export const updateEstadoPagoSchema = z.object({
  estado_pago: z.enum(['pendiente', 'comprobante_subido', 'pagado', 'rechazado']),
}).strict();

export const editPedidoSchema = z.object({
  nombre_cliente: z.string().min(1).max(150).optional(),
  mesa: z.string().max(20).optional(),
  telefono_cliente: z.string().max(40).optional(),
  observaciones: z.string().max(500).optional(),
  metodo_pago: z.enum(['transferencia', 'efectivo']).optional(),
  items: z
    .array(
      z.object({
        producto_id: z.coerce.number().int().min(1),
        cantidad: z.coerce.number().int().min(1),
      }).strict()
    )
    .min(1, 'Al menos un producto requerido')
    .optional(),
}).strict()
  .refine(
    (data) => data.items !== undefined || data.nombre_cliente !== undefined || data.mesa !== undefined || data.telefono_cliente !== undefined || data.observaciones !== undefined || data.metodo_pago !== undefined,
    { message: 'Debe enviarse al menos un campo para editar' }
  );

export const idParamSchema = z.object({
  id: z.coerce.number().int().min(1),
});
