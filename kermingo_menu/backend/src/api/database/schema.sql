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
);

-- 2. archivo_drive
CREATE TABLE IF NOT EXISTS archivo_drive (
    id INT AUTO_INCREMENT PRIMARY KEY,
    drive_id VARCHAR(150) NOT NULL UNIQUE,
    nombre_original VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    tamanio_bytes INT NOT NULL,
    tipo ENUM('producto_imagen', 'comprobante') NOT NULL,
    url_publica TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. categoria
CREATE TABLE IF NOT EXISTS categoria (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    activa TINYINT(1) NOT NULL DEFAULT 1
);

-- 4. producto (FK → archivo_drive)
CREATE TABLE IF NOT EXISTS producto (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    descripcion TEXT NULL,
    precio DECIMAL(10,2) NOT NULL,
    tipo ENUM('comida', 'bebida', 'combo') NOT NULL,
    stock_limitado TINYINT(1) NOT NULL DEFAULT 1,
    stock_actual INT NULL,
    stock_minimo_alerta INT NOT NULL DEFAULT 5,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    disponible_desde TIME NULL,
    imagen_archivo_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_producto_imagen FOREIGN KEY (imagen_archivo_id) REFERENCES archivo_drive(id)
);

-- 5. producto_categoria
CREATE TABLE IF NOT EXISTS producto_categoria (
    producto_id INT NOT NULL,
    categoria_id INT NOT NULL,
    PRIMARY KEY (producto_id, categoria_id),
    FOREIGN KEY (producto_id) REFERENCES producto(id),
    FOREIGN KEY (categoria_id) REFERENCES categoria(id)
);

-- 6. combo_producto
CREATE TABLE IF NOT EXISTS combo_producto (
    combo_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad INT NOT NULL DEFAULT 1,
    PRIMARY KEY (combo_id, producto_id),
    FOREIGN KEY (combo_id) REFERENCES producto(id),
    FOREIGN KEY (producto_id) REFERENCES producto(id)
);

-- 7. pedido (FK → archivo_drive)
CREATE TABLE IF NOT EXISTS pedido (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero VARCHAR(20) NOT NULL UNIQUE,
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
    total DECIMAL(10,2) NOT NULL,
    comprobante_archivo_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (comprobante_archivo_id) REFERENCES archivo_drive(id)
);

-- 8. pedido_detalle
CREATE TABLE IF NOT EXISTS pedido_detalle (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id INT NOT NULL,
    producto_id INT NOT NULL,
    nombre_producto VARCHAR(120) NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    cantidad INT NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (pedido_id) REFERENCES pedido(id),
    FOREIGN KEY (producto_id) REFERENCES producto(id)
);

-- 9. configuracion_tienda
CREATE TABLE IF NOT EXISTS configuracion_tienda (
    id INT PRIMARY KEY DEFAULT 1,
    estado ENUM('abierta', 'cerrada', 'demo') NOT NULL DEFAULT 'cerrada',
    mensaje_publico TEXT NULL,
    cena_habilitada_desde TIME NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================
-- Índices
-- ============================================

CREATE INDEX idx_producto_activo ON producto(activo);
CREATE INDEX idx_pedido_numero ON pedido(numero);
CREATE INDEX idx_pedido_token ON pedido(token_seguimiento);
CREATE INDEX idx_pedido_estado_pedido ON pedido(estado_pedido);
CREATE INDEX idx_pedido_estado_pago ON pedido(estado_pago);
CREATE INDEX idx_pedido_metodo_pago ON pedido(metodo_pago);
CREATE INDEX idx_pedido_created_at ON pedido(created_at);
