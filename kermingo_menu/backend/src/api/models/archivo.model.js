/**
 * Modelo para tabla `archivo_drive`.
 * Campos: id, drive_id, nombre_original, mime_type, tamanio_bytes, tipo, url_publica, created_at
 */

/**
 * Insert a new archivo_drive record within an existing DB transaction connection.
 * @param {import('mysql2/promise').PoolConnection} conn - Active transaction connection
 * @param {object} data
 * @param {string} data.drive_id - Google Drive file ID
 * @param {string} data.nombre_original - Original file name
 * @param {string} data.mime_type - MIME type
 * @param {number} data.tamanio_bytes - File size in bytes
 * @param {string} data.tipo - 'comprobante' | 'producto_imagen'
 * @param {string} [data.url_publica] - Optional public URL
 * @returns {Promise<number>} Inserted ID
 */
export async function createArchivo(conn, data) {
  const [result] = await conn.query(
    `INSERT INTO archivo_drive (drive_id, nombre_original, mime_type, tamanio_bytes, tipo, url_publica)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.drive_id,
      data.nombre_original,
      data.mime_type,
      data.tamanio_bytes,
      data.tipo,
      data.url_publica || null,
    ]
  );
  return result.insertId;
}

/**
 * Find an archivo_drive record by ID using the pool.
 * @param {import('mysql2/promise').Pool} pool
 * @param {number} id
 * @returns {Promise<object|null>}
 */
export async function findArchivoById(pool, id) {
  const [rows] = await pool.query(
    `SELECT id, drive_id, nombre_original, mime_type, tamanio_bytes, tipo, url_publica, created_at
     FROM archivo_drive WHERE id = ?`,
    [id]
  );
  return rows[0] || null;
}

/**
 * Find the active product image file record by product ID.
 * @param {import('mysql2/promise').Pool} pool
 * @param {number} productoId
 * @param {object} [options={}]
 * @param {boolean} [options.includeInactive=false] - If true, returns the image even if product is inactive
 * @returns {Promise<object|null>}
 */
export async function findProductImageByProductId(pool, productoId, { includeInactive = false } = {}) {
  const query = `
    SELECT a.id, a.drive_id, a.nombre_original, a.mime_type, a.tamanio_bytes, a.tipo, a.url_publica, a.created_at
    FROM archivo_drive a
    JOIN producto p ON p.imagen_archivo_id = a.id
    WHERE p.id = ? AND a.tipo = 'producto_imagen'
      ${includeInactive ? '' : 'AND p.activo = 1'}
  `;
  const [rows] = await pool.query(query, [productoId]);
  return rows[0] || null;
}
