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
