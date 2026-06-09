import { getPool } from '../database/db.js';
import {
  findKitchenPedidos,
  findById,
  updateEstadoPedido,
  transicionEstadoValida,
} from '../models/pedido.model.js';
import { respuestaExitosa } from '../utils/respuesta.utils.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

/**
 * GET /api/admin/cocina/pedidos
 * Lista pedidos operativos para cocina (excluye cancelado y entregado).
 * Ordenados por estado (recibido -> en_preparacion -> listo) y luego por antigüedad.
 */
export async function listarCocina(req, res, next) {
  try {
    const pool = getPool();
    const pedidos = await findKitchenPedidos(pool);
    return respuestaExitosa(res, pedidos, 'Pedidos de cocina obtenidos');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/cocina/pedidos/:id
 * Detalle de un pedido con items para cocina.
 */
export async function obtenerCocina(req, res, next) {
  try {
    const pool = getPool();
    const pedido = await findById(pool, req.params.id);
    if (!pedido) throw new NotFoundError('Pedido no encontrado');
    return respuestaExitosa(res, pedido, 'Pedido obtenido');
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/admin/cocina/pedidos/:id/estado
 * Avanza el estado del pedido por la ruta de cocina
 * (recibido -> en_preparacion -> listo -> entregado).
 * Reutiliza updateEstadoPedido del modelo pedido.
 */
export async function cambiarEstadoCocina(req, res, next) {
  try {
    const pool = getPool();
    const pedido = await findById(pool, req.params.id);
    if (!pedido) throw new NotFoundError('Pedido no encontrado');

    const actual = pedido.estado_pedido;
    const siguiente = req.body.estado_pedido;

    if (!transicionEstadoValida(actual, siguiente)) {
      throw new ValidationError('Transición de estado no válida para cocina');
    }

    const result = await updateEstadoPedido(pool, req.params.id, siguiente);

    if (result === -1) {
      throw new ValidationError('Transición de estado no válida para cocina');
    }

    const actualizado = await findById(pool, req.params.id);
    return respuestaExitosa(res, actualizado, 'Estado actualizado');
  } catch (err) {
    next(err);
  }
}
