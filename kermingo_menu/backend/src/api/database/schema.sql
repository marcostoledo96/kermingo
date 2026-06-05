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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Índices → ejecutar indexes.sql después de este archivo
-- ============================================
