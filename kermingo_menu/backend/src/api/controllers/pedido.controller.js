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
  aprobarComprobanteConTransaccion,
  assertStoreOpen,
} from '../models/pedido.model.js';
import { findArchivoById } from '../models/archivo.model.js';
import { uploadFile as driveUploadFile, downloadFile as driveDownloadFile } from '../services/drive.service.js';
import { respuestaExitosa } from '../utils/respuesta.utils.js';
import { NotFoundError, InsufficientStockError, ValidationError, DriveUploadError } from '../utils/errors.js';

/**
 * POST /api/pedidos (público)
 * Crea un pedido online. Valida stock, genera KMG-XXXX, token, descuenta stock.
 * Acepta multipart/form-data con comprobante para transferencia.
 */
export async function crear(req, res, next) {
  try {
    const metodoPago = req.body.metodo_pago;
    const tieneComprobante = !!req.file;

    // Los pedidos online solo aceptan transferencia.
    // Efectivo solo está disponible en caja.
    if (metodoPago === 'efectivo') {
      throw new ValidationError('Los pedidos online solo aceptan pago por transferencia. Para pagar en efectivo, acercate a caja.');
    }

    // Validar método de pago vs file
    if (metodoPago === 'transferencia' && !tieneComprobante) {
      throw new ValidationError('Transferencia online requiere comprobante. Usá efectivo en caja o subí el comprobante.');
    }
    if (metodoPago === 'efectivo' && tieneComprobante) {
      throw new ValidationError('Los pedidos en efectivo no requieren comprobante.');
    }

    // Preflight: verify store is open BEFORE attempting Drive upload
    // This prevents orphan Drive files when store is closed
    const pool = getPool();
    await assertStoreOpen(pool);

    let archivo = null;
    if (tieneComprobante) {
      // Upload to Drive BEFORE starting DB transaction
      const driveResult = await driveUploadFile(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );
      archivo = {
        drive_id: driveResult.driveFileId,
        nombre_original: req.file.originalname,
        mime_type: req.file.mimetype,
        tamanio_bytes: req.file.size,
        url_publica: driveResult.webViewLink,
      };
    }

    const result = await createWithTransaction(pool, {
      ...req.body,
      origen: 'online',
      archivo,
    });
    const pedido = await findByToken(pool, result.token);
    return respuestaExitosa(res, pedido, 'Pedido creado correctamente', 201);
  } catch (err) {
    if (err.name === 'DriveUploadError') {
      return next(new DriveUploadError());
    }
    if (err.message?.includes('Stock insuficiente')) {
      return next(new InsufficientStockError(err.message));
    }
    if (err.message?.includes('La tienda esta cerrada') || err.message?.includes('tiesta no está abierta')) {
      return next(new ValidationError('La tienda esta cerrada'));
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
    const data = { ...req.body };

    if (data.metodo_pago === 'efectivo' && data.estado_pago === undefined) {
      data.estado_pago = 'pagado';
    }

    const result = await createWithTransaction(pool, {
      ...data,
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
 * Cambia el estado del pedido (en_preparacion → listo → entregado).
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
 * PATCH /api/admin/pedidos/:id/comprobante/aprobar (admin)
 * Approves a transferencia comprobante transactionally: sets estado_pago=pagado
 * and, if the order is still recibido, moves it to en_preparacion so it shows
 * up in cocina. Rejected comprobantes can be re-approved. Never regresses
 * orders already in en_preparacion/listo/entregado. Rejects efectivo and
 * cancelled orders.
 */
export async function aprobarComprobante(req, res, next) {
  try {
    const pool = getPool();
    const result = await aprobarComprobanteConTransaccion(pool, req.params.id);
    if (result === 0) throw new NotFoundError('Pedido no encontrado');
    if (result === -1) throw new ValidationError('El comprobante no está en estado aprobable');
    if (result === -2) throw new ValidationError('Solo se aprueban comprobantes de transferencia');
    if (result === -3) throw new ValidationError('No se puede aprobar un pedido cancelado');
    if (result === -4) throw new ValidationError('El pedido no tiene comprobante adjunto');
    const pedido = await findById(pool, req.params.id);
    return respuestaExitosa(res, pedido, 'Comprobante aprobado y pedido enviado a cocina');
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
    if (err.message?.includes('no encontrado o inactivo')) {
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
    if (result === -1) throw new ValidationError('Solo se puede cancelar pedidos en estado en preparación');
    const pedido = await findById(pool, req.params.id);
    return respuestaExitosa(res, pedido, 'Pedido cancelado correctamente');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/pedidos/:id/comprobante (admin)
 * Returns comprobante metadata for a pedido. Does NOT proxy file bytes.
 */
export async function obtenerComprobante(req, res, next) {
  try {
    const pool = getPool();
    const pedido = await findById(pool, req.params.id);
    if (!pedido) throw new NotFoundError('Pedido no encontrado');

    if (!pedido.comprobante_archivo_id) {
      throw new NotFoundError('Este pedido no tiene comprobante asociado');
    }

    const archivo = await findArchivoById(pool, pedido.comprobante_archivo_id);
    if (!archivo) throw new NotFoundError('Comprobante no encontrado en almacenamiento');

    return respuestaExitosa(res, {
      nombre_original: archivo.nombre_original,
      mime_type: archivo.mime_type,
      tamanio_bytes: archivo.tamanio_bytes,
      url_publica: archivo.url_publica,
      url_proxy: `/api/admin/pedidos/${req.params.id}/comprobante/imagen`,
      created_at: archivo.created_at,
    }, 'Comprobante obtenido correctamente');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/pedidos/:id/comprobante/imagen (admin)
 * Proxies the comprobante image/PDF from Google Drive through the backend.
 * Uses the same pattern as GET /api/productos/:id/imagen.
 * Falls back to Drive's own contentType if the archivo record doesn't have one.
 */
export async function obtenerComprobanteImagen(req, res, next) {
  try {
    const pool = getPool();
    const pedido = await findById(pool, req.params.id);
    if (!pedido) throw new NotFoundError('Pedido no encontrado');

    if (!pedido.comprobante_archivo_id) {
      throw new NotFoundError('Este pedido no tiene comprobante asociado');
    }

    const archivo = await findArchivoById(pool, pedido.comprobante_archivo_id);
    if (!archivo) throw new NotFoundError('Comprobante no encontrado en almacenamiento');

    const contentType = archivo.mime_type || 'application/octet-stream';
    const stream = await driveDownloadFile(archivo.drive_id);

    // Set Content-Disposition: inline so browsers display images/PDFs instead of downloading
    const disposition = contentType.startsWith('image/')
      ? `inline; filename="comprobante-${req.params.id}${contentType.includes('png') ? '.png' : contentType.includes('webp') ? '.webp' : '.jpg'}"`
      : contentType === 'application/pdf'
        ? `inline; filename="comprobante-${req.params.id}.pdf"`
        : `inline; filename="comprobante-${req.params.id}"`;

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=300',
      'Content-Disposition': disposition,
    });
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
}
