# 05 — Base de datos MySQL

## Convenciones

- Tablas en singular.
- Nombres en español sin tildes.
- Campos técnicos sin ñ ni tildes.
- Relaciones muchos-a-muchos con tablas intermedias.
- Fechas con `created_at` y `updated_at`.
- Soft delete con `activo` o `deleted_at` según corresponda.

## Tabla `usuario`

Guarda usuarios administrativos.

```sql
CREATE TABLE usuario (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  contrasenia_hash VARCHAR(255) NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

Campos no obvios:

- `contrasenia_hash`: contraseña hasheada con bcrypt, nunca texto plano.
- `activo`: permite desactivar usuario sin borrarlo.

## Tabla `categoria`

Representa categorías comerciales del menú: Merienda y Cena.

```sql
CREATE TABLE categoria (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE,
  activa TINYINT(1) NOT NULL DEFAULT 1
);
```

Campos no obvios:

- `activa`: permite ocultar una categoría si no se usa.

## Tabla `producto`

Representa comidas, bebidas o combos/promos vendibles.

```sql
CREATE TABLE producto (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  descripcion TEXT NULL,
  precio DECIMAL(10,2) NOT NULL,
  tipo ENUM('comida','bebida','promo') NOT NULL,
  stock_limitado TINYINT(1) NOT NULL DEFAULT 1,
  stock_actual INT NULL,
  stock_minimo_alerta INT NOT NULL DEFAULT 5,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  disponible_desde TIME NULL,
  imagen_archivo_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_producto_imagen
    FOREIGN KEY (imagen_archivo_id) REFERENCES archivo_drive(id)
);
```

Campos no obvios:

- `tipo`: diferencia comida, bebida y promo.
- `stock_limitado`: si es 0, el producto no controla stock.
- `stock_actual`: solo se usa si `stock_limitado = 1`.
- `stock_minimo_alerta`: umbral para alertas en dashboard.
- `disponible_desde`: permite habilitar cena más tarde.
- `imagen_archivo_id`: imagen alojada en Drive.

## Tabla `producto_categoria`

Relación muchos-a-muchos entre producto y categoría.

Un producto puede estar en Merienda, Cena o ambas.

```sql
CREATE TABLE producto_categoria (
  producto_id INT NOT NULL,
  categoria_id INT NOT NULL,
  PRIMARY KEY (producto_id, categoria_id),
  FOREIGN KEY (producto_id) REFERENCES producto(id),
  FOREIGN KEY (categoria_id) REFERENCES categoria(id)
);
```

## Tabla `combo_producto`

Relación entre un combo y los productos que lo componen.

```sql
CREATE TABLE combo_producto (
  combo_id INT NOT NULL,
  producto_id INT NOT NULL,
  cantidad INT NOT NULL DEFAULT 1,
  PRIMARY KEY (combo_id, producto_id),
  FOREIGN KEY (combo_id) REFERENCES producto(id),
  FOREIGN KEY (producto_id) REFERENCES producto(id)
);
```

Campos no obvios:

- `combo_id`: producto de tipo `promo`.
- `producto_id`: producto interno que descuenta stock.
- `cantidad`: cantidad del producto interno por cada promo vendida.

## Tabla `pedido`

Representa una compra online o de caja.

```sql
CREATE TABLE pedido (
  id INT AUTO_INCREMENT PRIMARY KEY,
  numero VARCHAR(20) NULL UNIQUE,
  token_seguimiento VARCHAR(100) NOT NULL UNIQUE,
  origen ENUM('online','caja') NOT NULL,
  nombre_cliente VARCHAR(150) NOT NULL,
  mesa VARCHAR(20) NULL,
  telefono_cliente VARCHAR(40) NULL,
  telefono_whatsapp VARCHAR(30) NULL,
  observaciones TEXT NULL,
  metodo_pago ENUM('transferencia','efectivo') NOT NULL,
  estado_pago ENUM('pendiente','comprobante_subido','pagado','rechazado') NOT NULL DEFAULT 'pendiente',
  estado_pedido ENUM('recibido','en_preparacion','listo','entregado','cancelado') NOT NULL DEFAULT 'recibido',
  total DECIMAL(10,2) NOT NULL,
  comprobante_archivo_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (comprobante_archivo_id) REFERENCES archivo_drive(id)
);
```

Campos no obvios:

- `numero`: código visible del pedido, ejemplo `KMG-0001`.
- `token_seguimiento`: identificador privado para que el cliente consulte el pedido sin login.
- `origen`: permite distinguir compras online de ventas cargadas por caja.
- `telefono_cliente`: valor escrito por el cliente.
- `telefono_whatsapp`: versión normalizada para generar link WhatsApp.
- `estado_pago`: pago y pedido se separan para no mezclar cocina con caja.
- `estado_pedido`: estado operativo del pedido.
- `comprobante_archivo_id`: solo se usa con transferencia.

Regla importante:

```txt
Si metodo_pago = transferencia → comprobante obligatorio en checkout online.
Si metodo_pago = efectivo → comprobante_archivo_id debe ser NULL.
```

## Tabla `pedido_detalle`

Relación entre pedido y productos.

```sql
CREATE TABLE pedido_detalle (
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
```

Campos no obvios:

- `nombre_producto`: snapshot histórico por si luego cambia el producto.
- `precio_unitario`: precio histórico al momento de la venta.
- `subtotal`: precio_unitario * cantidad.

## Tabla `archivo_drive`

Centraliza archivos subidos a Google Drive.

```sql
CREATE TABLE archivo_drive (
  id INT AUTO_INCREMENT PRIMARY KEY,
  drive_id VARCHAR(150) NOT NULL UNIQUE,
  nombre_original VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  tamanio_bytes INT NOT NULL,
  tipo ENUM('producto_imagen','comprobante') NOT NULL,
  url_publica TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

Campos no obvios:

- `drive_id`: ID real del archivo en Google Drive.
- `mime_type`: permite diferenciar imagen/PDF.
- `tipo`: indica uso del archivo.
- `url_publica`: URL directa si se habilita acceso público.

## Tabla `configuracion_tienda`

Guarda configuración global de la tienda.

```sql
CREATE TABLE configuracion_tienda (
  id INT PRIMARY KEY DEFAULT 1,
  estado ENUM('abierta','cerrada','demo') NOT NULL DEFAULT 'cerrada',
  mensaje_publico TEXT NULL,
  cena_habilitada_desde TIME NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

Campos no obvios:

- `estado`: define si se aceptan pedidos reales.
- `mensaje_publico`: mensaje visible al cliente.
- `cena_habilitada_desde`: hora desde la cual se muestran/habilitan productos de cena.

## Índices sugeridos

```sql
CREATE INDEX idx_producto_activo ON producto(activo);
CREATE INDEX idx_pedido_numero ON pedido(numero);
CREATE INDEX idx_pedido_token ON pedido(token_seguimiento);
CREATE INDEX idx_pedido_estado_pedido ON pedido(estado_pedido);
CREATE INDEX idx_pedido_estado_pago ON pedido(estado_pago);
CREATE INDEX idx_pedido_metodo_pago ON pedido(metodo_pago);
CREATE INDEX idx_pedido_created_at ON pedido(created_at);
```
