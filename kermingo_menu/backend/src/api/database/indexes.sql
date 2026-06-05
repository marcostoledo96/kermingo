-- ============================================
-- Kermingo — Índices
-- ============================================
-- Ejecutar DESPUÉS de schema.sql, UNA SOLA VEZ.
-- Si se re-ejecuta y algún índice ya existe, el error
-- es inofensivo (los datos no se pierden).
-- Para reset completo: DROP DATABASE + CREATE + schema + indexes + seed.

CREATE INDEX idx_producto_activo ON producto(activo);
CREATE INDEX idx_pedido_numero ON pedido(numero);
CREATE INDEX idx_pedido_token ON pedido(token_seguimiento);
CREATE INDEX idx_pedido_estado_pedido ON pedido(estado_pedido);
CREATE INDEX idx_pedido_estado_pago ON pedido(estado_pago);
CREATE INDEX idx_pedido_metodo_pago ON pedido(metodo_pago);
CREATE INDEX idx_pedido_created_at ON pedido(created_at);
CREATE INDEX idx_producto_categoria_categoria ON producto_categoria(categoria_id, producto_id);
CREATE INDEX idx_pedido_detalle_pedido ON pedido_detalle(pedido_id);
