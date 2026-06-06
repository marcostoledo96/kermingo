import { z } from 'zod';

export const createPedidoSchema = z.object({
  nombre_cliente: z.string().min(1).max(150),
  mesa: z.string().max(20).optional(),
  telefono_cliente: z.string().max(40).optional(),
  observaciones: z.string().max(500).optional(),
  metodo_pago: z.enum(['transferencia', 'efectivo']),
  items: z
    .array(
      z.object({
        producto_id: z.coerce.number().int().min(1),
        cantidad: z.coerce.number().int().min(1),
      }).strict()
    )
    .min(1, 'Al menos un producto requerido'),
}).strict();

export const createCajaSchema = createPedidoSchema.extend({
  estado_pago: z.enum(['pendiente', 'pagado']).default('pendiente'),
  estado_pedido: z
    .enum(['recibido', 'en_preparacion', 'listo', 'entregado'])
    .default('recibido'),
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
});

export const updateEstadoPedidoSchema = z.object({
  estado_pedido: z.enum([
    'recibido',
    'en_preparacion',
    'listo',
    'entregado',
  ]),
}).strict();

export const updateEstadoPagoSchema = z.object({
  estado_pago: z.enum(['pendiente', 'pagado', 'rechazado']),
}).strict();

export const idParamSchema = z.object({
  id: z.coerce.number().int().min(1),
});
