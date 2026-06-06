import { getPool } from '../database/db.js';
import {
  findAllPublic,
  findByIdPublic,
  findAllAdmin,
  create,
  update,
  deactivate,
  restore,
  updateStock,
} from '../models/producto.model.js';
import { respuestaExitosa } from '../utils/respuesta.utils.js';
import { NotFoundError } from '../utils/errors.js';

/**
 * GET /api/productos
 * Lista pública de productos activos con filtros opcionales.
 */
export async function listar(req, res, next) {
  try {
    const pool = getPool();
    const productos = await findAllPublic(pool, req.query);
    return respuestaExitosa(res, productos, 'Productos obtenidos correctamente');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/productos/:id
 * Detalle público de un producto activo.
 */
export async function obtener(req, res, next) {
  try {
    const pool = getPool();
    const producto = await findByIdPublic(pool, req.params.id);
    if (!producto) throw new NotFoundError('Producto no encontrado');
    return respuestaExitosa(res, producto, 'Producto encontrado');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/productos
 * Lista admin paginada con filtros (estado, tipo).
 */
export async function listarAdmin(req, res, next) {
  try {
    const pool = getPool();
    const result = await findAllAdmin(pool, req.query);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 24;
    return respuestaExitosa(res, {
      productos: result.productos,
      paginacion: {
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      },
    }, 'Productos obtenidos correctamente');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/productos
 * Crea un nuevo producto.
 */
export async function crear(req, res, next) {
  try {
    const pool = getPool();
    const insertId = await create(pool, req.body);
    const producto = await findByIdPublic(pool, insertId);
    return respuestaExitosa(res, producto, 'Producto creado correctamente', 201);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/admin/productos/:id
 * Actualiza un producto existente.
 */
export async function actualizar(req, res, next) {
  try {
    const pool = getPool();
    const affectedRows = await update(pool, req.params.id, req.body);
    if (affectedRows === 0) throw new NotFoundError('Producto no encontrado');
    const producto = await findByIdPublic(pool, req.params.id);
    return respuestaExitosa(res, producto, 'Producto actualizado correctamente');
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/admin/productos/:id/desactivar
 * Desactiva (soft-delete) un producto.
 */
export async function desactivar(req, res, next) {
  try {
    const pool = getPool();
    const affectedRows = await deactivate(pool, req.params.id);
    if (affectedRows === 0) throw new NotFoundError('Producto no encontrado');
    return respuestaExitosa(res, { id: parseInt(req.params.id), activo: 0 }, 'Producto desactivado correctamente');
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/admin/productos/:id/recuperar
 * Reactiva un producto desactivado.
 */
export async function recuperar(req, res, next) {
  try {
    const pool = getPool();
    const affectedRows = await restore(pool, req.params.id);
    if (affectedRows === 0) throw new NotFoundError('Producto no encontrado');
    return respuestaExitosa(res, { id: parseInt(req.params.id), activo: 1 }, 'Producto recuperado correctamente');
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/admin/productos/:id/stock
 * Ajusta el stock actual de un producto.
 */
export async function ajustarStock(req, res, next) {
  try {
    const pool = getPool();
    const affectedRows = await updateStock(pool, req.params.id, req.body.stock_actual);
    if (affectedRows === 0) throw new NotFoundError('Producto no encontrado');
    return respuestaExitosa(res, { id: parseInt(req.params.id), stock_actual: req.body.stock_actual }, 'Stock actualizado correctamente');
  } catch (err) {
    next(err);
  }
}
