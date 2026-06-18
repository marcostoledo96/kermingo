-- Migration: product-admin-filtering-grouping-ordering
-- Adds producto.orden, producto.disponible, configuracion_tienda.categoria_default
-- Idempotent: safe to rerun; only backfills NULL rows.
-- Run after schema.sql seed on existing databases.

-- 1. Add nullable columns first (IF NOT EXISTS makes this idempotent)
ALTER TABLE producto ADD COLUMN IF NOT EXISTS orden INT NULL DEFAULT 0 AFTER activo;
ALTER TABLE producto ADD COLUMN IF NOT EXISTS disponible TINYINT(1) NULL DEFAULT 1 AFTER orden;

-- 2. Backfill only rows where the column is still NULL (freshly added, never set).
--    This avoids overwriting legitimate orden=0 or disponible=0 values on rerun.
UPDATE producto SET orden = id WHERE orden IS NULL;
UPDATE producto SET disponible = 1 WHERE disponible IS NULL;

-- 3. Now make them NOT NULL (safe because step 2 filled all NULLs)
ALTER TABLE producto MODIFY COLUMN orden INT NOT NULL DEFAULT 0;
ALTER TABLE producto MODIFY COLUMN disponible TINYINT(1) NOT NULL DEFAULT 1;

-- 4. Add categoria_default to configuracion_tienda
ALTER TABLE configuracion_tienda ADD COLUMN IF NOT EXISTS categoria_default ENUM('merienda', 'cena') NOT NULL DEFAULT 'merienda' AFTER cena_habilitada_desde;

-- 5. Create indexes (idempotent with IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_producto_orden ON producto(orden);
CREATE INDEX IF NOT EXISTS idx_producto_estado_orden ON producto(activo, disponible, orden);