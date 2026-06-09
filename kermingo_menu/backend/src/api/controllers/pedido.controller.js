import { getPool } from '../database/db.js';
import {
  createWithTransaction,
  findByToken,
  findById,
  findAllAdmin,
  updateEstadoPedido,
  updateEstadoPago,
  cancelWithTransaction,
  editWithTransaction,
} from '../models/pedido.model.js';
import { respuestaExitosa } from '../utils/respuesta.utils.js';
import { NotFoundError, InsufficientStockError, ValidationError } from '../utils/errors.js';

/**
 * POST /api/pedidos (público)
 * Crea un pedido online. Valida stock, genera KMG-XXXX, token, descuenta stock.
 */
export async function crear(req, res, next) {
  try {
    if (req.body.metodo_pago === 'transferencia') {
      throw new ValidationError('Transferencia online requiere comprobante. Usá efectivo o contactá al vendedor.');
    }
    const pool = getPool();
    const result = await createWithTransaction(pool, {
      ...req.body,
      origen: 'online',
    });
    const pedido = await findByToken(pool, result.token);
    return respuestaExitosa(res, pedido, 'Pedido creado correctamente', 201);
  } catch (err) {
    if (err.message?.includes('Stock insuficiente')) {
      return next(new InsufficientStockError(err.message));
    }
    if (err.message?.includes('tienda no está abierta')) {
      return next(new ValidationError('La tienda no está abierta para pedidos en este momento'));
    }
    next(err);
  }
}

/**
 * POST /api/admin/pedidos/caja (admin)
 * Crea un pedido desde caja rápida. El admin puede setear estado_pago=pagado directamente.
 */
export async function crearCaja(req, res, next) {
  try {
    const pool = getPool();
    const result = await createWithTransaction(pool, {
      ...req.body,
      origen: 'caja',
    });
    const pedido = await findById(pool, result.pedidoId);
    return respuestaExitosa(res, pedido, 'Pedido de caja creado correctamente', 201);
  } catch (err) {
    if (err.message?.includes('Stock insuficiente')) {
      return next(new InsufficientStockError(err.message));
    }
    if (err.message?.includes('tienda no está abierta')) {
      return next(new ValidationError('La tienda no está abierta para pedidos en este momento'));
    }
    next(err);
  }
}

/**
 * GET /api/pedidos/seguimiento/:token (público)
 * Estado público del pedido por token de seguimiento.
 */
export async function seguimiento(req, res, next) {
  try {
    const pool = getPool();
    const pedido = await findByToken(pool, req.params.token);
    if (!pedido) throw new NotFoundError('Pedido no encontrado');
    return respuestaExitosa(res, pedido, 'Pedido encontrado');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/pedidos (admin)
 * Lista pedidos con filtros y paginación.
 */
export async function listarAdmin(req, res, next) {
  try {
    const pool = getPool();
    const result = await findAllAdmin(pool, req.query);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 24;
    return respuestaExitosa(res, {
      pedidos: result.pedidos,
      paginacion: {
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      },
    }, 'Pedidos obtenidos correctamente');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/pedidos/:id (admin)
 * Detalle completo de un pedido con sus items.
 */
export async function obtenerAdmin(req, res, next) {
  try {
    const pool = getPool();
    const pedido = await findById(pool, req.params.id);
    if (!pedido) throw new NotFoundError('Pedido no encontrado');
    return respuestaExitosa(res, pedido, 'Pedido encontrado');
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/admin/pedidos/:id/estado (admin)
 * Cambia el estado del pedido (recibido → en_preparacion → listo → entregado).
 */
export async function cambiarEstado(req, res, next) {
  try {
    const pool = getPool();
    const result = await updateEstadoPedido(pool, req.params.id, req.body.estado_pedido);
    if (result === 0) throw new NotFoundError('Pedido no encontrado');
    if (result === -1) throw new ValidationError('Transición de estado no válida');
    const pedido = await findById(pool, req.params.id);
    return respuestaExitosa(res, pedido, 'Estado actualizado correctamente');
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/admin/pedidos/:id/pago (admin)
 * Cambia el estado del pago.
 */
export async function cambiarPago(req, res, next) {
  try {
    const pool = getPool();
    const result = await updateEstadoPago(pool, req.params.id, req.body.estado_pago);
    if (result === 0) throw new NotFoundError('Pedido no encontrado');
    if (result === -1) throw new ValidationError('Transicion de estado de pago no valida');
    if (result === -2) throw new ValidationError('No se puede modificar el pago de un pedido cancelado');
    const pedido = await findById(pool, req.params.id);
    return respuestaExitosa(res, pedido, 'Estado de pago actualizado correctamente');
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/admin/pedidos/:id (admin)
 * Edita un pedido de caja con reconciliación de stock.
 */
export async function editar(req, res, next) {
  try {
    const pool = getPool();
    const result = await editWithTransaction(pool, req.params.id, req.body);
    if (result === 0) throw new NotFoundError('Pedido no encontrado');
    if (result === -1) throw new ValidationError('No se puede editar un pedido cancelado o entregado');
    if (result === -2) throw new ValidationError('Solo se pueden editar pedidos de caja');
    const pedido = await findById(pool, req.params.id);
    return respuestaExitosa(res, pedido, 'Pedido actualizado correctamente');
  } catch (err) {
    if (err.esOperacional) return next(err);
    if (err.message?.includes('Stock insuficiente')) {
      return next(new InsufficientStockError(err.message));
    }
    if (err.message?.includes('Producto') && err.message?.includes('no encontrado')) {
      return next(new ValidationError(err.message));
    }
    if (err.message?.includes('no tiene componentes')) {
      return next(new ValidationError(err.message));
    }
    next(err);
  }
}

/**
 * PATCH /api/admin/pedidos/:id/cancelar (admin)
 * Cancela un pedido y repone el stock.
 */
export async function cancelar(req, res, next) {
  try {
    const pool = getPool();
    const result = await cancelWithTransaction(pool, req.params.id);
    if (result === 0) throw new NotFoundError('Pedido no encontrado');
    if (result === -1) throw new ValidationError('Solo se puede cancelar pedidos en estado recibido o en preparación');
    const pedido = await findById(pool, req.params.id);
    return respuestaExitosa(res, pedido, 'Pedido cancelado correctamente');
  } catch (err) {
    next(err);
  }
}
