import { getPool } from '../database/db.js';
import {
  findAllPublic,
  findByIdPublic,
  findAllAdmin,
  create,
  update,
  setProductoCategorias,
  deactivate,
  restore,
  updateStock,
  findByIdAdmin,
  updateImagenArchivoId,
  updateOrdenes,
  promoTieneComponentes,
} from '../models/producto.model.js';
import { findProductImageByProductId, createArchivo } from '../models/archivo.model.js';
import { processProductImage } from '../services/image.service.js';
import { uploadFile, downloadFile } from '../services/drive.service.js';
import { respuestaExitosa } from '../utils/respuesta.utils.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import environments from '../config/environments.js';

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
    const conn = await pool.getConnection();
    const { categorias, ...productoData } = req.body;

    // Safe promo guard: a brand-new promo cannot have components yet, so it must
    // start as no disponible until components are configured.
    if (productoData.tipo === 'promo' && productoData.disponible === 1) {
      productoData.disponible = 0;
    }

    try {
      await conn.beginTransaction();
      const insertId = await create(conn, productoData);

      if (typeof categorias !== 'undefined') {
        await setProductoCategorias(conn, insertId, categorias);
      }

      await conn.commit();

      const producto = await findByIdAdmin(pool, insertId);
      return respuestaExitosa(res, producto, 'Producto creado correctamente', 201);
    } catch (err) {
      try {
        await conn.rollback();
      } catch {
        // noop
      }
      throw err;
    } finally {
      conn.release();
    }
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
    const conn = await pool.getConnection();
    const { categorias, ...productoData } = req.body;
    const { id } = req.params;

    // Safe promo guard: refuse to set disponible=1 on a promo without components.
    if (productoData.disponible === 1) {
      const tipo = productoData.tipo ?? (await findByIdAdmin(pool, id))?.tipo;
      if (tipo === 'promo' && !(await promoTieneComponentes(conn, id, 'promo'))) {
        conn.release();
        return next(new ValidationError('La promo no tiene componentes configurados. Agregalos antes de habilitarla.'));
      }
    }

    try {
      await conn.beginTransaction();

      const hasProductoData = Object.keys(productoData).length > 0;

      if (hasProductoData) {
        const affectedRows = await update(conn, id, productoData);
        if (affectedRows === 0) {
          throw new NotFoundError('Producto no encontrado');
        }
      } else {
        const existente = await findByIdAdmin(pool, id);
        if (!existente) {
          throw new NotFoundError('Producto no encontrado');
        }
      }

      if (Object.prototype.hasOwnProperty.call(req.body, 'categorias')) {
        await setProductoCategorias(conn, id, categorias);
      }

      await conn.commit();
    } catch (err) {
      try {
        await conn.rollback();
      } catch {
        // noop
      }
      throw err;
    } finally {
      conn.release();
    }

    const producto = await findByIdAdmin(pool, id);
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

/**
 * PATCH /api/admin/productos/orden
 * Batch-reorder products. Body: { ordenes: [{ id, orden }] }
 */
export async function reordenar(req, res, next) {
  try {
    const pool = getPool();
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await updateOrdenes(conn, req.body.ordenes);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
    // Return updated list
    const result = await findAllAdmin(pool, { estado: 'todos', page: 1, limit: 100 });
    return respuestaExitosa(res, result.productos, 'Orden actualizado correctamente');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/productos/:id/imagen
 * Obtiene la imagen de un producto y la transmite desde Google Drive.
 */
export async function obtenerImagen(req, res, next) {
  try {
    const pool = getPool();
    const { id } = req.params;
    const imagen = await findProductImageByProductId(pool, id);
    if (!imagen) {
      throw new NotFoundError('Imagen del producto no encontrada');
    }

    const stream = await downloadFile(imagen.drive_id);
    res.writeHead(200, {
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      'Content-Disposition': `inline; filename="producto-${id}.webp"`,
    });
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/productos/:id/imagen
 * Sube y procesa la imagen de un producto.
 */
export async function subirImagen(req, res, next) {
  const pool = getPool();
  let conn = null;
  try {
    const { id } = req.params;
    const producto = await findByIdAdmin(pool, id);
    if (!producto) throw new NotFoundError('Producto no encontrado');

    const processed = await processProductImage(req.file.buffer);

    const folderId = environments.googleDrive.productosFolderId || environments.googleDrive.folderId;
    const driveResult = await uploadFile(
      processed.buffer,
      `producto-${id}.webp`,
      processed.mimeType,
      { folderId }
    );

    conn = await pool.getConnection();
    await conn.beginTransaction();

    const archivoId = await createArchivo(conn, {
      drive_id: driveResult.driveFileId,
      nombre_original: req.file.originalname || `producto-${id}.webp`,
      mime_type: processed.mimeType,
      tamanio_bytes: processed.size,
      tipo: 'producto_imagen',
    });

    await updateImagenArchivoId(conn, id, archivoId);

    await conn.commit();
    conn.release();
    conn = null;

    const updatedProducto = await findByIdAdmin(pool, id);
    return respuestaExitosa(res, updatedProducto, 'Imagen de producto subida correctamente');
  } catch (err) {
    if (conn) {
      await conn.rollback();
      conn.release();
    }
    next(err);
  }
}

/**
 * DELETE /api/admin/productos/:id/imagen
 * Quita la imagen asociada a un producto sin eliminarla de Google Drive.
 */
export async function quitarImagen(req, res, next) {
  try {
    const pool = getPool();
    const { id } = req.params;
    const producto = await findByIdAdmin(pool, id);
    if (!producto) throw new NotFoundError('Producto no encontrado');

    await updateImagenArchivoId(pool, id, null);

    const updatedProducto = await findByIdAdmin(pool, id);
    return respuestaExitosa(res, updatedProducto, 'Imagen de producto quitada correctamente');
  } catch (err) {
    next(err);
  }
}
