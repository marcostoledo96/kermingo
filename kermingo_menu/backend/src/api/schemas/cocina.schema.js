import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.coerce.number().int().min(1),
});

export const updateEstadoPedidoCocinaSchema = z.object({
  estado_pedido: z.enum([
    'recibido',
    'en_preparacion',
    'listo',
    'entregado',
  ]),
}).strict();
