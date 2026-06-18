function toNumber(value, fallback = 0) {
  if (value === null || value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export async function obtenerReportes(pool) {
  const [[metricas]] = await pool.query(`
    SELECT
      COALESCE(SUM(CASE WHEN p.estado_pago = 'pagado' AND p.estado_pedido != 'cancelado' THEN p.total ELSE 0 END), 0) AS total_recaudado,
      COALESCE(SUM(CASE WHEN p.estado_pago = 'pagado' AND p.metodo_pago = 'efectivo' AND p.estado_pedido != 'cancelado' THEN p.total ELSE 0 END), 0) AS total_efectivo,
      COALESCE(SUM(CASE WHEN p.estado_pago = 'pagado' AND p.metodo_pago = 'transferencia' AND p.estado_pedido != 'cancelado' THEN p.total ELSE 0 END), 0) AS total_transferencia,
      COUNT(CASE WHEN p.estado_pago = 'pagado' AND p.estado_pedido != 'cancelado' THEN 1 END) AS pedidos_pagados,
      COUNT(CASE WHEN p.estado_pago IN ('pendiente', 'rechazado') AND p.estado_pedido != 'cancelado' THEN 1 END) AS pedidos_pendientes_pago,
      COALESCE(SUM(CASE WHEN p.estado_pago IN ('pendiente', 'rechazado') AND p.estado_pedido != 'cancelado' THEN p.total ELSE 0 END), 0) AS monto_pendiente_pago
    FROM pedido p
  `);

  const [[productosVendidos]] = await pool.query(`
    SELECT
      COALESCE(SUM(pd.cantidad), 0) AS productos_vendidos
    FROM pedido_detalle pd
    INNER JOIN pedido p ON p.id = pd.pedido_id
    WHERE p.estado_pedido != 'cancelado'
      AND p.estado_pago = 'pagado'
  `);

  const [rankingFilas] = await pool.query(`
    SELECT
      pd.producto_id AS producto_id,
      MAX(pd.nombre_producto) AS nombre,
      COALESCE(SUM(pd.cantidad), 0) AS cantidad,
      COALESCE(SUM(pd.subtotal), 0) AS total_recaudado
    FROM pedido_detalle pd
    INNER JOIN pedido p ON p.id = pd.pedido_id
    WHERE p.estado_pedido != 'cancelado'
      AND p.estado_pago = 'pagado'
    GROUP BY pd.producto_id
    ORDER BY cantidad DESC, pd.producto_id ASC
  `);

  const ranking_productos = rankingFilas.map((row) => ({
    producto_id: Number(row.producto_id),
    nombre: row.nombre,
    cantidad: toNumber(row.cantidad, 0),
    total_recaudado: toNumber(row.total_recaudado, 0),
  }));

  return {
    total_recaudado: toNumber(metricas.total_recaudado, 0),
    total_efectivo: toNumber(metricas.total_efectivo, 0),
    total_transferencia: toNumber(metricas.total_transferencia, 0),
    pedidos_pagados: toNumber(metricas.pedidos_pagados, 0),
    pedidos_pendientes_pago: toNumber(metricas.pedidos_pendientes_pago, 0),
    monto_pendiente_pago: toNumber(metricas.monto_pendiente_pago, 0),
    productos_vendidos: toNumber(productosVendidos.productos_vendidos, 0),
    producto_top: ranking_productos[0] || null,
    ranking_productos,
    actualizado_en: new Date().toISOString(),
  };
}
