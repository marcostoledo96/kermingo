-- Kermingo anonymized archival snapshot — 2026-07-28
-- Safe for public git. Synthetic pedidos; catalog from seed.
-- Restore: mysql ... < this file
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS=0;
CREATE DATABASE IF NOT EXISTS kermingo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE kermingo;
DROP TABLE IF EXISTS pedido_detalle;
DROP TABLE IF EXISTS pedido;
DROP TABLE IF EXISTS combo_producto;
DROP TABLE IF EXISTS producto_categoria;
DROP TABLE IF EXISTS producto;
DROP TABLE IF EXISTS categoria;
DROP TABLE IF EXISTS archivo_drive;
DROP TABLE IF EXISTS configuracion_tienda;
DROP TABLE IF EXISTS usuario;
-- ============================================
-- Kermingo — Schema de Base de Datos
-- ============================================

-- 1. usuario
CREATE TABLE IF NOT EXISTS usuario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    contrasenia_hash VARCHAR(255) NOT NULL,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. archivo_drive
CREATE TABLE IF NOT EXISTS archivo_drive (
    id INT AUTO_INCREMENT PRIMARY KEY,
    drive_id VARCHAR(150) NOT NULL UNIQUE,
    nombre_original VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    tamanio_bytes INT NOT NULL CHECK (tamanio_bytes > 0),
    tipo ENUM('producto_imagen', 'comprobante') NOT NULL,
    url_publica TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. categoria
CREATE TABLE IF NOT EXISTS categoria (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    activa TINYINT(1) NOT NULL DEFAULT 1
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. producto (FK → archivo_drive)
CREATE TABLE IF NOT EXISTS producto (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    descripcion TEXT NULL,
    precio DECIMAL(10,2) NOT NULL CHECK (precio >= 0),
    tipo ENUM('comida', 'bebida', 'promo') NOT NULL,
    stock_limitado TINYINT(1) NOT NULL DEFAULT 1,
    stock_actual INT NULL CHECK (stock_actual IS NULL OR stock_actual >= 0),
    stock_minimo_alerta INT NOT NULL DEFAULT 5 CHECK (stock_minimo_alerta >= 0),
    activo TINYINT(1) NOT NULL DEFAULT 1,
    disponible TINYINT(1) NOT NULL DEFAULT 1,
    orden INT NOT NULL DEFAULT 0,
    disponible_desde TIME NULL,
    imagen_archivo_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_producto_imagen FOREIGN KEY (imagen_archivo_id) REFERENCES archivo_drive(id)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. producto_categoria
CREATE TABLE IF NOT EXISTS producto_categoria (
    producto_id INT NOT NULL,
    categoria_id INT NOT NULL,
    PRIMARY KEY (producto_id, categoria_id),
    FOREIGN KEY (producto_id) REFERENCES producto(id),
    FOREIGN KEY (categoria_id) REFERENCES categoria(id)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. combo_producto (representa la composición de productos tipo 'promo')
CREATE TABLE IF NOT EXISTS combo_producto (
    combo_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad INT NOT NULL DEFAULT 1 CHECK (cantidad > 0),
    PRIMARY KEY (combo_id, producto_id),
    FOREIGN KEY (combo_id) REFERENCES producto(id),
    FOREIGN KEY (producto_id) REFERENCES producto(id)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. pedido (FK → archivo_drive)
CREATE TABLE IF NOT EXISTS pedido (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero VARCHAR(20) NULL UNIQUE,
    token_seguimiento VARCHAR(100) NOT NULL UNIQUE,
    origen ENUM('online', 'caja') NOT NULL,
    nombre_cliente VARCHAR(150) NOT NULL,
    mesa VARCHAR(20) NULL,
    telefono_cliente VARCHAR(40) NULL,
    telefono_whatsapp VARCHAR(30) NULL,
    observaciones TEXT NULL,
    metodo_pago ENUM('transferencia', 'efectivo') NOT NULL,
    estado_pago ENUM('pendiente', 'comprobante_subido', 'pagado', 'rechazado') NOT NULL DEFAULT 'pendiente',
    estado_pedido ENUM('recibido', 'en_preparacion', 'listo', 'entregado', 'cancelado') NOT NULL DEFAULT 'recibido',
    total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
    comprobante_archivo_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_pedido_comprobante FOREIGN KEY (comprobante_archivo_id) REFERENCES archivo_drive(id),
    CONSTRAINT chk_pedido_comprobante_efectivo CHECK (
        metodo_pago <> 'efectivo' OR comprobante_archivo_id IS NULL
    )
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. pedido_detalle
CREATE TABLE IF NOT EXISTS pedido_detalle (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id INT NOT NULL,
    producto_id INT NOT NULL,
    nombre_producto VARCHAR(120) NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL CHECK (precio_unitario >= 0),
    cantidad INT NOT NULL CHECK (cantidad > 0),
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    FOREIGN KEY (pedido_id) REFERENCES pedido(id),
    FOREIGN KEY (producto_id) REFERENCES producto(id)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. configuracion_tienda
-- estado: 'abierta' permite pedidos reales, 'cerrada' bloquea pedidos,
-- 'demo' permite frontend con mocks pero NO crea pedidos reales en DB
CREATE TABLE IF NOT EXISTS configuracion_tienda (
    id INT PRIMARY KEY DEFAULT 1,
    estado ENUM('abierta', 'cerrada', 'demo') NOT NULL DEFAULT 'cerrada',
    mensaje_publico TEXT NULL,
    cena_habilitada_desde TIME NULL,
    categoria_default ENUM('merienda', 'cena') NOT NULL DEFAULT 'merienda',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Índices → ejecutar indexes.sql después de este archivo
-- ============================================
-- ============================================
-- Kermingo — Índices
-- ============================================
-- Ejecutar DESPUÉS de schema.sql, UNA SOLA VEZ.
-- Si se re-ejecuta y algún índice ya existe, el error
-- es inofensivo (los datos no se pierden).
-- Para reset completo: DROP DATABASE + CREATE + schema + indexes + seed.

CREATE INDEX IF NOT EXISTS idx_producto_activo ON producto(activo);
CREATE INDEX IF NOT EXISTS idx_producto_orden ON producto(orden);
CREATE INDEX IF NOT EXISTS idx_producto_estado_orden ON producto(activo, disponible, orden);
CREATE INDEX IF NOT EXISTS idx_pedido_numero ON pedido(numero);
CREATE INDEX IF NOT EXISTS idx_pedido_token ON pedido(token_seguimiento);
CREATE INDEX IF NOT EXISTS idx_pedido_estado_pedido ON pedido(estado_pedido);
CREATE INDEX IF NOT EXISTS idx_pedido_estado_pago ON pedido(estado_pago);
CREATE INDEX IF NOT EXISTS idx_pedido_metodo_pago ON pedido(metodo_pago);
CREATE INDEX IF NOT EXISTS idx_pedido_created_at ON pedido(created_at);
CREATE INDEX IF NOT EXISTS idx_producto_categoria_categoria ON producto_categoria(categoria_id, producto_id);
CREATE INDEX IF NOT EXISTS idx_pedido_detalle_pedido ON pedido_detalle(pedido_id);
-- ============================================
-- Kermingo — Datos Iniciales (Seed)
-- ============================================

-- Categorías
INSERT IGNORE INTO categoria (id, nombre, activa) VALUES
(1, 'Merienda', 1),
(2, 'Cena', 1);

-- Configuración de tienda (cerrada por defecto)
INSERT IGNORE INTO configuracion_tienda (id, estado, categoria_default) VALUES (1, 'cerrada', 'merienda');

-- Productos — Cena · Comidas
INSERT IGNORE INTO producto (id, nombre, descripcion, precio, tipo, stock_limitado, stock_actual, stock_minimo_alerta, activo, disponible, orden) VALUES
(1,  'Pizza muzza',       'Porción de muzzarella bien tirada con orégano.',                  3500, 'comida', 1, 30, 5, 1, 1, 1),
(2,  'Pizza napolitana',  'Muzza, tomate en rodajas y ajo.',                                  3800, 'comida', 1, 20, 5, 1, 1, 2),
(3,  'Pizza jamón',       'Muzza con jamón cocido.',                                          3900, 'comida', 1, 15, 3, 1, 1, 3),
(4,  'Pizza sin TACC',    'Masa apta celíacos. Cantidad limitada.',                           4200, 'comida', 1, 0,  2, 1, 1, 4),
(5,  'Pancho',            'Pancho completo con aderezos a elección.',                         2500, 'comida', 1, 40, 5, 1, 1, 5),
(6,  'Nuggets',           'Porción de 6 con papas.',                                          3000, 'comida', 1, 20, 5, 1, 1, 6),
(7,  'Nuggets veggies',   'Opción vegetariana, porción de 6.',                                3200, 'comida', 1, 12, 3, 1, 1, 7),

-- Productos — Merienda · Comidas
(8,  'Chocotorta',         'Porción clásica de chocolinas y dulce de leche.',                 2500, 'comida', 1, 20, 3, 1, 1, 8),
(9,  'Torta frita',        'Recién hechas, ideales con mate.',                                1000, 'comida', 1, 30, 5, 1, 1, 9),
(10, 'Medialunas',         'Par de medialunas de manteca.',                                   1600, 'comida', 1, 25, 3, 1, 1, 10),
(11, 'Medialunas J&Q',     'Rellenas con jamón y queso, calentitas.',                         2200, 'comida', 1, 15, 3, 1, 1, 11),
(12, 'Churros',            'Rellenos de dulce de leche.',                                     1500, 'comida', 1, 20, 3, 1, 1, 12),
(13, 'Tortas varias',      'Porción del día, consultá los sabores.',                          2500, 'comida', 1, 12, 2, 1, 1, 13),

-- Productos — Merienda y Cena
(14, 'Helados palito',     'Variedad de gustos. Sujeto a disponibilidad.',                    2000, 'comida', 1, 0,  3, 1, 1, 14),

-- Bebidas
(15, 'Coca Cola',          'Lata 354 ml bien fría.',                                          2000, 'bebida', 1, 60, 5, 1, 1, 15),
(16, 'Gaseosa naranja',    'Lata 354 ml.',                                                    1900, 'bebida', 1, 30, 5, 1, 1, 16),
(17, 'Lima limón',         'Lata 354 ml.',                                                    1900, 'bebida', 1, 20, 5, 1, 1, 17),
(18, 'Agua mineral',       'Botella 500 ml, con o sin gas.',                                  1500, 'bebida', 0, NULL, 0, 1, 1, 18),
(19, 'Mate cocido',        'Calentito, servido en vaso.',                                     1200, 'bebida', 0, NULL, 0, 1, 1, 19),
(20, 'Té',                 'Variedad de saquitos.',                                           1000, 'bebida', 0, NULL, 0, 1, 1, 20),
(21, 'Café',               'Café de filtro recién hecho.',                                    1500, 'bebida', 1, 40, 5, 1, 1, 21),
(22, 'Chocolatada',        'Bien chocolatosa, fría o caliente.',                              1800, 'bebida', 1, 30, 5, 1, 1, 22),

-- Promos (sin stock propio — disponibilidad calculada por componentes en combo_producto)
(23, 'Combo merienda',     '3 medialunas + café o mate cocido.',                              3500, 'promo', 0, NULL, 0, 1, 1, 23),
(24, 'Combo cena',         'Pancho + porción de pizza + gaseosa.',                            6500, 'promo', 0, NULL, 0, 1, 1, 24);

-- Relaciones producto - categoria
INSERT IGNORE INTO producto_categoria (producto_id, categoria_id) VALUES
-- Cena
(1, 2), (2, 2), (3, 2), (4, 2), (5, 2), (6, 2), (7, 2),
-- Merienda
(8, 1), (9, 1), (10, 1), (11, 1), (12, 1), (13, 1),
-- Ambas
(14, 1), (14, 2),
(15, 1), (15, 2), (16, 1), (16, 2), (17, 1), (17, 2),
(18, 1), (18, 2), (19, 1), (20, 1), (21, 1), (22, 1),
-- Promos
(23, 1), (24, 2);

-- Componentes internos de promos (combo_producto)
INSERT IGNORE INTO combo_producto (combo_id, producto_id, cantidad) VALUES
-- Combo merienda: 3 medialunas + 1 café
(23, 10, 3),  -- 3 medialunas
(23, 21, 1),  -- 1 café
-- Combo cena: 1 pancho + 1 pizza muzza + 1 coca cola
(24, 5,  1),  -- 1 pancho
(24, 1,  1),  -- 1 pizza muzza
(24, 15, 1);  -- 1 coca cola

-- Usuario admin (TEMPORAL — contraseña: admin123)
-- REEMPLAZAR en etapa B4 (Auth) con hash generado por el sistema
INSERT IGNORE INTO usuario (id, nombre, email, contrasenia_hash, activo) VALUES
(1, 'Admin', 'admin@kermingo.com', '$2b$10$NJeTubdE9ncZRJoVj373ZOsT2ubw9hpCMmDDhceBV.O2ZdfhtX23e', 1);

-- Archival store message (overrides seed cerrada row)
UPDATE configuracion_tienda
SET estado = 'cerrada',
    mensaje_publico = 'Kermingo 2026 finalizó. Este sitio es un portfolio en modo demo: los pedidos y cambios no se guardan.',
    categoria_default = 'merienda'
WHERE id = 1;

-- Synthetic archivo placeholders (no real Drive)
INSERT INTO archivo_drive (id, drive_id, nombre_original, mime_type, tamanio_bytes, tipo, url_publica) VALUES
(1, 'demo-drive-producto-1', '1.png', 'image/png', 100000, 'producto_imagen', NULL),
(2, 'demo-drive-comprobante-1', 'receipt-demo.png', 'image/png', 50000, 'comprobante', NULL)
ON DUPLICATE KEY UPDATE nombre_original = VALUES(nombre_original);

UPDATE producto SET imagen_archivo_id = 1 WHERE id = 1;

-- Synthetic event pedidos (anonymized)
INSERT INTO pedido (id, numero, token_seguimiento, origen, nombre_cliente, mesa, telefono_cliente, telefono_whatsapp, observaciones, metodo_pago, estado_pago, estado_pedido, total, comprobante_archivo_id, created_at, updated_at) VALUES
(1, 'KMG-0001', 'demodemo000000000000000000000001', 'online', 'Cliente Demo 1', 'Mesa 3', '1199001001', '5491199001001', NULL, 'transferencia', 'pagado', 'entregado', 7000.00, 2, '2026-06-20 12:10:00', '2026-06-20 13:00:00'),
(2, 'KMG-0002', 'demodemo000000000000000000000002', 'caja', 'Cliente Demo 2', 'Mesa 7', '1199001002', '5491199001002', 'Sin cebolla', 'efectivo', 'pagado', 'entregado', 2500.00, NULL, '2026-06-20 12:25:00', '2026-06-20 12:55:00'),
(3, 'KMG-0003', 'demodemo000000000000000000000003', 'online', 'Cliente Demo 3', NULL, '1199001003', '5491199001003', NULL, 'transferencia', 'comprobante_subido', 'recibido', 3500.00, 2, '2026-06-20 13:05:00', '2026-06-20 13:05:00'),
(4, 'KMG-0004', 'demodemo000000000000000000000004', 'caja', 'Cliente Demo 4', 'Barra', '1199001004', '5491199001004', NULL, 'efectivo', 'pagado', 'en_preparacion', 6500.00, NULL, '2026-06-20 13:20:00', '2026-06-20 13:22:00'),
(5, 'KMG-0005', 'demodemo000000000000000000000005', 'online', 'Cliente Demo 5', 'Mesa 1', '1199001005', '5491199001005', NULL, 'transferencia', 'pagado', 'listo', 4000.00, 2, '2026-06-20 13:40:00', '2026-06-20 14:10:00')
ON DUPLICATE KEY UPDATE nombre_cliente = VALUES(nombre_cliente);

INSERT INTO pedido_detalle (pedido_id, producto_id, nombre_producto, precio_unitario, cantidad, subtotal) VALUES
(1, 1, 'Pizza muzza', 3500, 2, 7000),
(2, 5, 'Pancho', 2500, 1, 2500),
(3, 23, 'Combo merienda', 3500, 1, 3500),
(4, 24, 'Combo cena', 6500, 1, 6500),
(5, 15, 'Coca Cola', 2000, 2, 4000);

SET FOREIGN_KEY_CHECKS=1;
